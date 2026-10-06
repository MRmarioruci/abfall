import { View, Text } from "react-native";
import { cn } from "../../lib/utils";

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <View className={cn("rounded-2xl bg-white p-4 shadow-sm border border-gray-100", className)}>
      {children}
    </View>
  );
}

export function CardTitle({ className, children }: CardProps) {
  return (
    <Text className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </Text>
  );
}

export function CardDescription({ className, children }: CardProps) {
  return (
    <Text className={cn("text-sm text-gray-500 mt-1", className)}>
      {children}
    </Text>
  );
}
