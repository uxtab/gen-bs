'use strict';

import RequestWrapper from './RequestWrapper';
import UserEntityClientBase from './UserEntityClientBase';

export default class AnalysesHistoryClient extends UserEntityClientBase {
    constructor(urls) {
        super(urls, urls.analysesHistoryUrls());
    }

    getQueryHistory(languageId, search, limit, offset, callback) {
        RequestWrapper.get(this.urls.history(),
            this._makeHeaders({languageId}), {search, limit, offset}, null, callback);
    }
}
