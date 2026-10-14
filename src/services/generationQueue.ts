export type QueueCancellationRegistration = (cancel: () => void) => void;

type QueueTask = {
  id: string;
  resolve: () => void;
  reject: (error: Error) => void;
  userKey: string;
  timestamp: number;
};

type ActiveTask = {
  id: string;
  userKey: string;
  timestamp: number;
};

export type QueueStatus = {
  isBusy: boolean;
  activeUser: string | null;
  queueLength: number;
  position: number;
  selfIsActive: boolean;
  activeTaskStartTime: number | null;
};

/**
 * Single-process generation queue.
 *
 * This is intentionally kept behind a small interface so it can later be
 * replaced by a shared coordinator without changing route or use-case code.
 */
export class GenerationQueue {
  private readonly queue: QueueTask[] = [];
  private activeTask: ActiveTask | null = null;
  private lastActiveUser: string | null = null;

  public async enqueue(
    userKey: string,
    onDisconnect: QueueCancellationRegistration,
  ): Promise<{ release: () => void }> {
    const id = Math.random().toString(36).substring(2, 9);
    const userQueuedCount = this.queue.filter((task) => task.userKey === userKey).length;

    if (userQueuedCount >= 3) {
      throw new Error(
        'တောင်းဆိုမှုများလွန်းနေပါသည်။ (Too Many Requests in Queue). ကျေးဇူးပြု၍ သင်၏ ယခင်တောင်းဆိုမှုများ ပြီးဆုံးသည်အထိ ခဏစောင့်ဆိုင်းပေးပါ။',
      );
    }

    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({ id, resolve, reject, userKey, timestamp: Date.now() });
    });

    onDisconnect(() => {
      const index = this.queue.findIndex((task) => task.id === id);
      if (index >= 0) {
        const [removed] = this.queue.splice(index, 1);
        removed.reject(new Error('Request cancelled by client disconnection'));
      }
    });

    this.processNext();
    await promise;

    return {
      release: () => {
        this.activeTask = null;
        this.processNext();
      },
    };
  }

  public getStatus(userKey: string): QueueStatus {
    const positionInQueue = this.queue.findIndex((task) => task.userKey === userKey);
    const selfIsActive = this.activeTask?.userKey === userKey;

    return {
      isBusy: this.activeTask !== null,
      activeUser: this.activeTask?.userKey ?? null,
      queueLength: this.queue.length,
      position: positionInQueue >= 0 ? positionInQueue + 1 : 0,
      selfIsActive,
      activeTaskStartTime: this.activeTask?.timestamp ?? null,
    };
  }

  private processNext(): void {
    if (this.activeTask !== null || this.queue.length === 0) {
      return;
    }

    let selectedIndex = 0;
    if (this.lastActiveUser && this.queue.length > 1) {
      const firstTask = this.queue[0];
      if (firstTask.userKey === this.lastActiveUser) {
        const alternativeIndex = this.queue.findIndex(
          (task) => task.userKey !== this.lastActiveUser,
        );
        if (alternativeIndex !== -1) {
          selectedIndex = alternativeIndex;
        }
      }
    }

    const nextTask = this.queue.splice(selectedIndex, 1)[0];
    if (!nextTask) {
      return;
    }

    this.activeTask = {
      id: nextTask.id,
      userKey: nextTask.userKey,
      timestamp: Date.now(),
    };
    this.lastActiveUser = nextTask.userKey;
    nextTask.resolve();
  }
}
