
// use-cases/ListHotkeysInteractor.ts
import { Hotkey } from '@/modules/hotkeys/entities/Hotkey';
import { HotkeyRepository } from '@/modules/hotkeys/interface/HotkeyRepository';

export class ListHotkeysInteractor {
  constructor(private hotkeyRepository: HotkeyRepository) {}

  async execute(): Promise<Hotkey[]> {
    return this.hotkeyRepository.listHotkeys();
  }
}