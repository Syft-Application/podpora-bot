import { store } from './secrets';

export default {
    is_enabled: function(name: string): boolean {
        return !!store.featureFlag(name);
    }
};
