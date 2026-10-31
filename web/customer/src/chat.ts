export type Choice = 'cancel' | 'pause'
// 0 complaint · 1 Yurko offers options · 2 safety check running · 3 confirmed + receipt
export type Step = 0 | 1 | 2 | 3
export type ChatState = { step: Step; choice: Choice; rating: number }

export const initialChat: ChatState = { step: 0, choice: 'cancel', rating: 0 }
