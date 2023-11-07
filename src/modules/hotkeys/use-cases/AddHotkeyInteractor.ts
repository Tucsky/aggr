// use-cases/AddHotkeyInteractor.ts
import { Hotkey } from '@/modules/hotkeys/entities/Hotkey'
import { HotkeyRepository } from '@/modules/hotkeys/interface/HotkeyRepository'

export class AddHotkeyInteractor {
  constructor(private hotkeyRepository: HotkeyRepository) {}

  async execute(hotkey: Hotkey): Promise<void> {
    // Implement any validation or business logic here.
    await this.hotkeyRepository.addHotkey(hotkey);
  }
}
