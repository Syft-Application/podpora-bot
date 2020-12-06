interface IssueChangelog {
    id: string
    items: Array<{
        field: string
        fieldtype: string
        fieldId: string
        from: string
        fromString: string
        to: string
        toString: string
    }>
}

interface Attachment {
    self: string
    id: string
    filename: string
    mimeType: string
    content: string
}

interface Issue {
    id: number,
    key: string,
    self: string,
    fields: {
        summary: string,
        attachment: Array<Attachment>,
        issuelinks: Array<DetailIssueLink>
    }
}

interface IssueLink {
    id: number
    sourceIssueId: number,
    destinationIssueId: number,
    issueLinkType: {
        id: number,
        name: string,
        outwardName: string,
        inwardName: string,
        isSubTaskLinkType: boolean,
        isSystemLinkType: boolean
    },
    systemLink: boolean
}

interface DetailIssueLink {
    id: number,
    self: string,
    type: {
        id: number,
        name: string,
        inward: string,
        outward: string,
        self: string,
    },
    outwardIssue: Issue,
    inwardIssue: Issue
}

export {
    IssueChangelog,
    Attachment,
    Issue ,
    IssueLink ,
    DetailIssueLink ,
};
