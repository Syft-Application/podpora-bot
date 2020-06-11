function MockWebClient(token: string): void {
    this.token = token;
}

MockWebClient.prototype = {
    dialog: {
        resolve: true,
        open: jest.fn(function(): Promise<string> {
            return new Promise((resolve, reject) => {
                process.nextTick(() => {
                    if (this.resolve) {
                        resolve();
                    } else {
                        reject(new Error('Something went wrong with open dialog'));
                    }
                });
            });
        })
    },

    chat: {
        resolve: true,
        postMessage: jest.fn(function(): Promise<string> {
            return new Promise((resolve, reject) => {
                process.nextTick(() => {
                    if (this.resolve) {
                        resolve();
                    } else {
                        reject(new Error('Something went wrong with postMessage'));
                    }
                });
            });
        })
    }
};

jest.mock('@slack/web-api', () => {
    return {
        WebClient: MockWebClient
    };
});

export {
    MockWebClient
};
