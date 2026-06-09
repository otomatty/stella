/**
 * Icon re-exports. shadcn/ui + lucide-react standard.
 * Includes a small custom Google SVG (lucide has no Google icon).
 */
export {
  Home,
  BookOpen as Book,
  Play,
  Pause,
  FileText,
  Check,
  CheckCircle2 as CheckCircle,
  Circle,
  Lock,
  Users,
  User,
  BarChart3 as BarChart,
  Settings,
  Bell,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  X,
  Plus,
  Sparkles,
  MessageCircle,
  Award,
  Clock,
  Calendar,
  CalendarClock,
  UserPlus,
  ClipboardList,
  Upload,
  Download,
  Code2 as Code,
  Terminal,
  Folder,
  Zap,
  Video,
  HelpCircle,
  Send,
  AlertCircle,
  AlertTriangle,
  Info,
  Flame,
  TrendingUp,
  TrendingDown,
  Dot,
  LogOut,
  MoreHorizontal,
  Filter,
  Eye,
  Pencil as Edit,
  ThumbsUp,
  ThumbsDown,
  Mail,
  School,
  Cpu,
  Building2 as Building,
  Shield,
  SlidersHorizontal as Sliders,
  Star,
  Link as LinkIcon,
  Presentation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  RefreshCw,
  Volume2,
  VolumeX,
  ChevronUp,
  Loader2,
  Trash2 as Trash,
  GripVertical,
  Save,
  PlayCircle,
  Inbox,
  Megaphone,
  CheckCheck,
} from 'lucide-react';

import type { SVGProps } from 'react';

export const Google = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={16}
    height={16}
    {...props}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.44.34-2.1V7.06H2.18A10.99 10.99 0 0 0 1 12c0 1.77.42 3.44 1.18 4.94l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
    />
  </svg>
);
