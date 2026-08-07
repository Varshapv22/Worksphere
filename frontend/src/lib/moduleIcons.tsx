import {
  BarChart3,
  Blocks,
  Boxes,
  Clock,
  GraduationCap,
  Handshake,
  Kanban,
  LifeBuoy,
  UserCheck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const moduleIconMap: Record<string, LucideIcon> = {
  BarChart3,
  Clock,
  Wallet,
  Handshake,
  Kanban,
  Boxes,
  LifeBuoy,
  UserCheck,
  GraduationCap,
  UserPlus,
};

export function moduleIcon(icon?: string | null): LucideIcon {
  return (icon && moduleIconMap[icon]) || Blocks;
}
