import { store } from './secrets';

export default {
    is_enabled: function(name: string): Boolean {
        return !!store.featureFlag(name);
    }
}
