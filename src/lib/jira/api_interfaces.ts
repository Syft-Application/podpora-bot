interface IssueChangelog {
    id: string
    items: Array<{
        field: string
        fieldtype: string
        fieldId: string
        from: string | null
        fromString: string | null
        to: string | null
        toString: string | null
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
    id: number | string,
    key: string,
    self: string,
    fields: {
        summary: string,
        attachment: Array<Attachment>,
        issuelinks: Array<DetailIssueLinks>
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
    id: string,
    self: string,
    type: {
        id: string,
        name: string,
        inward: string,
        outward: string,
        self: string,
    }
}

interface LinkIssue {
    id: string,
    key: string,
    self: string,
    fields: {
        summary: string
        status: { id: string, name: string }
        issuetype: {
            self: string
            id: string
            description: string
            iconUrl: string
            name: string
            subtask: boolean
            avatarId: number
        }
    }
}

interface DetailOutwardIssueLink extends DetailIssueLink {
    outwardIssue: LinkIssue
}

interface DetailInwardIssueLink extends DetailIssueLink {
    inwardIssue: LinkIssue
}

function isOutwardIssueDetailLink(
    link: DetailIssueLinks
): link is DetailOutwardIssueLink {
    return (<DetailOutwardIssueLink>link).outwardIssue !== undefined;
}

// function isInwardIssueDetailLink(
//     link: DetailIssueLinks
// ): link is DetailInwardIssueLink {
//     return (<DetailInwardIssueLink>link).inwardIssue !== undefined;
// }

type DetailIssueLinks = DetailOutwardIssueLink | DetailInwardIssueLink;

interface Transition {
    [index: string]: string | boolean;

    id: string,
    looped: boolean
};

interface IssueParams {
    // [index: string]: Record<string, unknown>;

    fields: {
        project: { key: string },
        summary: string,
        issuetype: { name: string },
        description: string,
        labels: Array<string>,
        components?: Array<{ name: string }>,
    }

    transition?: Transition
}

export {
    IssueChangelog,
    Attachment,
    Issue,
    IssueLink,
    IssueParams,
    DetailIssueLinks,
    // isInwardIssueDetailLink,
    isOutwardIssueDetailLink,
    DetailInwardIssueLink,
    DetailOutwardIssueLink
};
