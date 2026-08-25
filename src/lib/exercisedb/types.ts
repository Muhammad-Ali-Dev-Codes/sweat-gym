export interface ExerciseDbMeta {
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextCursor: string | null;
}

export interface ExerciseDbExerciseDTO {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[];
  equipments: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
}

export interface ExerciseDbResponse {
  success: boolean;
  meta: ExerciseDbMeta;
  data: ExerciseDbExerciseDTO[];
}

export interface ExerciseDbErrorResponse {
  success: false;
  error: string;
}
