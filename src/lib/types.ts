export type QuestionType = "text" | "textarea" | "select" | "radio";

export type Question = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
};

export type Survey = {
  id: string;
  siteId: string;
  title: string;
  questions: Question[];
};
