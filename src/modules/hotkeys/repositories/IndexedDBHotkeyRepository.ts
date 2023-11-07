import { HotkeyRepository } from "@/modules/hotkeys/interface/HotkeyRepository";
import { Hotkey } from "@/modules/hotkeys/entities/Hotkey"

export class IndexedDBHotkeyRepository implements HotkeyRepository {
 async addHotkey(hotkey: Hotkey): Promise<void> {
   // Implement code to add a hotkey to IndexedDB
 }

 async removeHotkey(id: string): Promise<void> {
   // Implement code to remove a hotkey from IndexedDB
 }

 async listHotkeys(): Promise<Hotkey[]> {
   // Implement code to list all hotkeys from IndexedDB
   return [];
 }

 async updateHotkey(id: string, hotkey: Hotkey): Promise<void> {

 }

 async getHotkey(id: string): Promise<Hotkey | null> {
   return null
 }
}