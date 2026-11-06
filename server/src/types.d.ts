// Adds our own `userId` field to Express's Request type (set by requireAuth).
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export {};
