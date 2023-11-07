// entities/Hotkey.ts
export class Hotkey {
 constructor(
   public id: string, // Unique identifier
   public name: string, // Descriptor
   public operand: string,
   public condition: string
 ) {}
}


