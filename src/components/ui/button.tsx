import { cva, type VariantProps } from "class-variance-authority";
import { Pressable, Text } from "react-native";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "flex-row items-center justify-center rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-gray-900",
        secondary: "bg-gray-100",
        outline: "border border-gray-300 bg-transparent",
        destructive: "bg-red-500",
        ghost: "bg-transparent",
      },
      size: {
        default: "h-12 px-5",
        sm: "h-9 px-3",
        lg: "h-14 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const buttonTextVariants = cva("font-semibold", {
  variants: {
    variant: {
      default: "text-white",
      secondary: "text-gray-900",
      outline: "text-gray-900",
      destructive: "text-white",
      ghost: "text-gray-900",
    },
    size: {
      default: "text-base",
      sm: "text-sm",
      lg: "text-lg",
      icon: "text-base",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  label: string;
  onPress?: () => void;
  className?: string;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant,
  size,
  className,
  disabled,
}: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        buttonVariants({ variant, size }),
        disabled && "opacity-50",
        className
      )}
    >
      <Text className={cn(buttonTextVariants({ variant, size }))}>{label}</Text>
    </Pressable>
  );
}
