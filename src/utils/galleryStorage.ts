import { Project } from '../types';

const GALLERY_STORAGE_KEY = 'alamin_gallery_items';
const ORDER_STORAGE_KEY = 'alamin_gallery_order';
const DELETED_STATIC_KEY = 'alamin_deleted_static';

export function getLocalGallery(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalGallery(items: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('[GalleryStorage] Save notice:', e);
  }
}

export function getLocalOrder(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalOrder(orderIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orderIds));
  } catch (e) {
    console.warn('[GalleryStorage] Save order notice:', e);
  }
}

export function getLocalDeletedStaticIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_STATIC_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDeletedStaticIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DELETED_STATIC_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('[GalleryStorage] Save deleted notice:', e);
  }
}
