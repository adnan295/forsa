import { useWindowDimensions } from "react-native";

/** عرض التصميم المعتمد للشاشة الرئيسية بالبكسل (832 × 1792) */
export const DESIGN_WIDTH = 832;

/** أقصى عرض يُقاس عليه — الويب العريض لا يكبّر البطاقات بلا حدود */
const MAX_REFERENCE_WIDTH = 480;

/**
 * يحوّل بكسلات التصميم إلى نقاط على الجهاز الحالي بنفس النسبة،
 * فتبقى المقاسات متناسقة من آيفون صغير إلى أندرويد كبير.
 */
export function useDesignScale() {
  const { width } = useWindowDimensions();
  const px = Math.min(width, MAX_REFERENCE_WIDTH) / DESIGN_WIDTH;
  return (value: number) => Math.round(value * px * 2) / 2;
}
