"""Exercise deployment failure boundaries with an isolated fake Docker host."""
import os
import pathlib
import shutil
import subprocess
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parents[1] / 'scripts/deploy-production.sh'

class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = pathlib.Path(self.tmp.name)
        (self.root / 'scripts/sql').mkdir(parents=True)
        shutil.copy(SCRIPT, self.root / 'scripts/deploy-production.sh')
        (self.root / 'scripts/sql/nayvo-schema.sql').write_text('CREATE TABLE products(id int);')
        (self.root / 'scripts/sql/launch-hardening.sql').write_text('ALTER TABLE products ADD COLUMN IF NOT EXISTS label text;')
        (self.root / '.env.production').write_text('DOMAIN=nayvo.store\n')
        bindir = self.root / 'bin'
        bindir.mkdir()
        (bindir / 'git').write_text('#!/bin/sh\ncase "$*" in *branch*) echo main;; *rev-parse*) echo testcommit;; esac\n')
        (bindir / 'docker').write_text('''#!/bin/bash
set -eu
printf '%s\\n' "$*" >> "$TEST_LOG"
case "$*" in
  *"build app"*) [[ "${FAIL_AT:-}" != build ]];;
  *"SELECT current_database()"*) echo "${TEST_DB:-forsa}";;
  *pg_dump*) [[ "${FAIL_AT:-}" != backup ]] && echo backup-content;;
  *"pg_restore --list"*) cat >/dev/null; [[ "${FAIL_AT:-}" != verify ]];;
  *--single-transaction*) cat >> "$TEST_SQL"; [[ "${FAIL_AT:-}" != reset ]];;
esac
''')
        for p in bindir.iterdir():
            p.chmod(0o755)
        self.env = dict(os.environ, PATH=str(bindir) + os.pathsep + os.environ['PATH'],
                        TEST_LOG=str(self.root / 'calls'), TEST_SQL=str(self.root / 'reset.sql'))

    def tearDown(self):
        self.tmp.cleanup()

    def run_deploy(self, mode='--reset-data', **env):
        return subprocess.run(['bash', str(self.root / 'scripts/deploy-production.sh'), mode],
                              env=dict(self.env, **env), capture_output=True, text=True)

    def calls(self):
        p = self.root / 'calls'
        return p.read_text() if p.exists() else ''

    def test_build_failure_leaves_live_application_running(self):
        self.assertNotEqual(self.run_deploy(FAIL_AT='build').returncode, 0)
        self.assertNotIn('stop app', self.calls())
        self.assertNotIn('--single-transaction', self.calls())

    def test_wrong_database_never_stops_or_deletes(self):
        self.assertNotEqual(self.run_deploy(TEST_DB='another_app').returncode, 0)
        self.assertNotIn('stop app', self.calls())
        self.assertNotIn('--single-transaction', self.calls())

    def test_failed_backup_or_verification_never_deletes(self):
        for failure in ['backup', 'verify']:
            with self.subTest(failure=failure):
                self.assertNotEqual(self.run_deploy(FAIL_AT=failure).returncode, 0)
                self.assertNotIn('--single-transaction', self.calls())

    def test_schema_failure_does_not_start_new_app_or_mark_complete(self):
        self.assertNotEqual(self.run_deploy(FAIL_AT='reset').returncode, 0)
        self.assertNotIn('up -d app caddy', self.calls())
        self.assertFalse((self.root / '.deploy/nayvo-v1.1-reset.done').exists())

    def test_success_backs_up_before_reset_and_blocks_second_reset(self):
        result = self.run_deploy()
        self.assertEqual(result.returncode, 0, result.stderr)
        calls = self.calls()
        self.assertLess(calls.index('pg_restore --list'), calls.index('--single-transaction'))
        self.assertLess(calls.index('--single-transaction'), calls.index('up -d app caddy'))
        self.assertIn('DROP SCHEMA public CASCADE;', (self.root / 'reset.sql').read_text())
        self.assertTrue((self.root / '.deploy/nayvo-v1.1-reset.done').exists())
        count = calls.count('--single-transaction')
        self.assertNotEqual(self.run_deploy().returncode, 0)
        self.assertEqual(self.calls().count('--single-transaction'), count)

    def test_update_preserves_schema_and_runs_migration(self):
        result = self.run_deploy('--update')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('--single-transaction', self.calls())
        self.assertNotIn('DROP SCHEMA', (self.root / 'reset.sql').read_text())

if __name__ == '__main__':
    unittest.main()
