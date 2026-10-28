// Stand-in for react-native-svg so components copied from the app render
// as plain web SVG in the video. Same component names, same props.
import type { SVGProps } from "react";

const el = (tag: string) =>
  function El(props: any) {
    const Tag = tag as any;
    return <Tag {...props} />;
  };

const Svg = (props: SVGProps<SVGSVGElement>) => <svg xmlns="http://www.w3.org/2000/svg" {...props} />;
export default Svg;
export const G = el("g");
export const Path = el("path");
export const Rect = el("rect");
export const Circle = el("circle");
export const Ellipse = el("ellipse");
