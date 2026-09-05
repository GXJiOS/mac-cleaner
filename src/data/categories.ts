import type { CategoryId } from '../types';

export type CategoryIcon = 'drive' | 'code' | 'archive' | 'puzzle';

export interface CategoryMeta {
  id: CategoryId;
  title: string;
  subtitle: string;
  shortLabel: string;
  icon: CategoryIcon;
  accent: string;
  glow: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'userCache',
    title: '系统垃圾',
    subtitle: '用户缓存、应用日志和临时文件',
    shortLabel: 'CACHE',
    icon: 'drive',
    accent: '#73f2b1',
    glow: 'rgba(65, 226, 157, 0.26)',
  },
  {
    id: 'devJunk',
    title: '开发者垃圾',
    subtitle: 'Xcode 构建产物、模拟器和包管理器缓存',
    shortLabel: 'DEVELOPER',
    icon: 'code',
    accent: '#70d7ff',
    glow: 'rgba(74, 187, 255, 0.25)',
  },
  {
    id: 'largeFiles',
    title: '大文件',
    subtitle: '超过 500 MB 且 90 天未访问的文件',
    shortLabel: 'ARCHIVE',
    icon: 'archive',
    accent: '#ffcf74',
    glow: 'rgba(255, 185, 76, 0.25)',
  },
  {
    id: 'appLeftovers',
    title: '应用残留',
    subtitle: '疑似已卸载应用留下的配置和数据',
    shortLabel: 'LEFTOVERS',
    icon: 'puzzle',
    accent: '#c79aff',
    glow: 'rgba(176, 105, 255, 0.25)',
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<CategoryId, CategoryMeta>;
