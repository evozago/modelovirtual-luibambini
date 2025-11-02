

export enum ProcessingStep {
  IDLE = 'IDLE',
  CLEANING = 'CLEANING',
  GENERATING_TEXT = 'GENERATING_TEXT',
  GENERATE_MODEL_IMAGE = 'GENERATE_MODEL_IMAGE',
  EDITING = 'EDITING',
  DONE = 'DONE',
  ERROR = 'ERROR',
}

export interface ProcessingState {
  step: ProcessingStep;
}

export interface ProductOutput {
  cleanedImage: string;
  modelImage: string;
  description: string;
  continuationCommand: string;
  socialMediaPost: string;
}

export enum Gender {
  FEMALE = 'FEMININO',
  MALE = 'MASCULINO',
}

export enum Age {
  BABY = 'bebê',
  ONE_TO_THREE = '1 a 3 anos',
  FOUR_TO_EIGHT = '4 a 8 anos',
  NINE_TO_TWELVE = '9 a 12 anos',
}

export enum Theme {
  PARTY = 'FESTA',
  BEACH = 'MODA PRAIA',
  CASUAL = 'CASUAL',
  BAPTISM = 'BATIZADO',
}

export enum Background {
  BEACH = 'PRAIA',
  GARDEN = 'JARDIM',
  STUDIO = 'STÚDIO FOTOGRAFICO',
  RUNWAY = 'PASSARELA',
  PARK = 'PARQUE DE DIVERSÃO',
  CHRISTMAS = 'NATAL',
}

export enum PieceCount {
  SINGLE = 'PEÇA ÚNICA',
  SET = 'CONJUNTO',
}

export interface GenerationOptions {
  pieceCount: PieceCount;
  gender: Gender;
  age: Age;
  theme: Theme;
  background?: Background | '';
}