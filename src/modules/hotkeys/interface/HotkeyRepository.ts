import { Hotkey } from '@/modules/hotkeys/entities/Hotkey';

export interface HotkeyRepository {
  addHotkey(hotkey: Hotkey): Promise<void>;
  removeHotkey(id: string): Promise<void>;
  updateHotkey(id: string, hotkey: Hotkey): Promise<void>;
  listHotkeys(): Promise<Hotkey[]>;
}
