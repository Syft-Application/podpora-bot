function MockWebClient(token: string) {
    this.token = token;
}

MockWebClient.prototype = {
    dialog: {
        resolve: true,
        open: jest.fn(function() {
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
