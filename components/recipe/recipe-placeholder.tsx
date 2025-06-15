import { ScrollText, FileText, BookOpen, ClipboardList } from "lucide-react";

interface RecipePlaceholderProps {
  className?: string;
  variant?: number;
}

const icons = [ScrollText, FileText, BookOpen, ClipboardList];

export function RecipePlaceholder({ className = "", variant }: RecipePlaceholderProps) {
  // Use variant if provided, otherwise generate based on current time for consistency
  const iconIndex = variant !== undefined ? variant % icons.length : Math.floor(Date.now() / 10000) % icons.length;
  const Icon = icons[iconIndex];
  
  // Generate a subtle gradient background
  const gradients = [
    "from-orange-50 to-amber-50",
    "from-blue-50 to-cyan-50",
    "from-green-50 to-emerald-50",
    "from-purple-50 to-pink-50"
  ];
  const gradientClass = gradients[iconIndex % gradients.length];
  
  // Determine icon size based on container height
  const getIconSize = () => {
    if (className?.includes('h-64')) return 'h-16 w-16'; // Photo gallery
    if (className?.includes('h-32')) return 'h-8 w-8';   // Recipe card
    return 'h-10 w-10'; // Default
  };
  
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${gradientClass} dark:from-muted dark:to-muted ${className}`}>
      <Icon className={`${getIconSize()} text-muted-foreground/40`} />
    </div>
  );
}