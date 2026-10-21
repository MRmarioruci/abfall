import Svg, { Path, Circle, Rect } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

const sw = (w = 1.8) =>
  ({
    fill: "none",
    strokeWidth: w,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }) as const;

export function SearchIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={10.5} cy={10.5} r={6.5} stroke={color} {...sw(2)} />
      <Path d="m15.5 15.5 4 4" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function PinIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21c4-4.5 6.5-8 6.5-11A6.5 6.5 0 0 0 5.5 10c0 3 2.5 6.5 6.5 11Z"
        stroke={color}
        {...sw(1.9)}
      />
      <Circle cx={12} cy={10} r={2.3} stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function HomeIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 11 12 4l8 7M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5"
        stroke={color}
        {...sw(1.9)}
      />
    </Svg>
  );
}

export function CalIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={5} width={17} height={15.5} rx={3} stroke={color} {...sw(1.9)} fill="none" />
      <Path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function CameraIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M3.5 8.5A2 2 0 0 1 5.5 6.5h1.8l1.1-1.8a1 1 0 0 1 .85-.47h5.6a1 1 0 0 1 .85.47L16.7 6.5h1.8a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V8.5Z"
        stroke={color}
        {...sw(1.9)}
      />
      <Circle cx={12} cy={12.7} r={3.4} stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function BellIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 10a6 6 0 0 1 12 0c0 4.5 1.4 6 1.4 6H4.6S6 14.5 6 10Z"
        stroke={color}
        {...sw(1.8)}
      />
      <Path d="M10 19.5a2 2 0 0 0 4 0" stroke={color} {...sw(1.8)} />
    </Svg>
  );
}

export function UserIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={8.5} r={3.7} stroke={color} {...sw(1.9)} />
      <Path d="M5 20a7 7 0 0 1 14 0" stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function BackIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 5l-7 7 7 7M7 12h12" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function ArrowURIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 17 17 7M8.5 7H17v8.5" stroke={color} {...sw(2.1)} />
    </Svg>
  );
}

export function ChevRIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size * 0.62} height={size} viewBox="0 0 8 14">
      <Path
        d="M1 1l6 6-6 6"
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} stroke={color} {...sw(1.8)} />
      <Path
        d="M12 2v2.5M12 19.5V22M4 12H1.5M22.5 12H20M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7M18.4 18.4l-1.7-1.7M7.3 7.3 5.6 5.6"
        stroke={color}
        {...sw(1.7)}
      />
    </Svg>
  );
}

export function MoonIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
        stroke={color}
        {...sw(1.8)}
      />
    </Svg>
  );
}

export function PlusIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" stroke={color} {...sw(2.1)} />
    </Svg>
  );
}

export function XIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6 6 18" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12.5 10 17.5 19 7" stroke={color} {...sw(2.6)} />
    </Svg>
  );
}

// Google "G" logo — uses Google's signature four colors. Ignores the
// `color` prop because the logo is multi-color by design.
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <Path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </Svg>
  );
}

export function PencilIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M14 4l6 6-11 11H3v-6L14 4z M13 5l6 6"
        stroke={color}
        {...sw(2)}
      />
    </Svg>
  );
}

export function HeartIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.5C5.5 16 3 12.4 3 8.9 3 6.2 5.1 4 7.9 4c1.7 0 3.2.9 4.1 2.3C12.9 4.9 14.4 4 16.1 4 18.9 4 21 6.2 21 8.9c0 3.5-2.5 7.1-9 11.6Z"
        stroke={color}
        {...sw(1.8)}
      />
    </Svg>
  );
}

export function ScanIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Four corner brackets — classic scan frame */}
      <Path d="M4 8V6a2 2 0 0 1 2-2h2" stroke={color} {...sw(2)} />
      <Path d="M16 4h2a2 2 0 0 1 2 2v2" stroke={color} {...sw(2)} />
      <Path d="M20 16v2a2 2 0 0 1-2 2h-2" stroke={color} {...sw(2)} />
      <Path d="M8 20H6a2 2 0 0 1-2-2v-2" stroke={color} {...sw(2)} />
      {/* Scanning line across the middle */}
      <Path d="M4 12h16" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function ShareIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3v13M12 3l-4 4M12 3l4 4" stroke={color} {...sw(2)} />
      <Path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function LinkIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M10 14a3.5 3.5 0 0 1 0-5l3-3a3.5 3.5 0 1 1 5 5l-1 1"
        stroke={color}
        {...sw(2)}
      />
      <Path
        d="M14 10a3.5 3.5 0 0 1 0 5l-3 3a3.5 3.5 0 1 1-5-5l1-1"
        stroke={color}
        {...sw(2)}
      />
    </Svg>
  );
}

export function GlobeIcon({ color, size = 19 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} {...sw(2)} />
      <Path d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9Z" stroke={color} {...sw(2)} />
    </Svg>
  );
}

export function FlashIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 3 5.5 13.2h5.6L10 21l7.5-10.2h-5.6L13 3Z" stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function ImageIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={3} stroke={color} {...sw(1.9)} />
      <Circle cx={9} cy={9.5} r={1.6} stroke={color} {...sw(1.7)} />
      <Path d="m4 17 4.6-4.3a1.5 1.5 0 0 1 2 0L15 16.5l1.9-1.7a1.5 1.5 0 0 1 2 0l1.6 1.5" stroke={color} {...sw(1.9)} />
    </Svg>
  );
}

export function MoreIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5.5} cy={12} r={2} fill={color} />
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Circle cx={18.5} cy={12} r={2} fill={color} />
    </Svg>
  );
}
