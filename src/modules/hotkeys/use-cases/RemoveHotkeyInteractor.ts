import { Hotkey } from '@/modules/hotkeys/entities/Hotkey';
import { HotkeyRepository } from '@/modules/hotkeys/interface/HotkeyRepository';

export class RemoveHotkeyInteractor {
  constructor(private hotkeyRepository: HotkeyRepository) {}

  async execute(id: string): Promise<void> {
    return this.hotkeyRepository.removeHotkey(id);
  }
}