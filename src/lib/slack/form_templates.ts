import { Dialog } from '@slack/web-api';

const bug: Dialog = {
    callback_id: '',
    title: 'Report Bug',
    submit_label: 'Submit',
    state: 'support_bug',
    elements: [
        {
            type: 'text',
            label: 'Title',
            placeholder: 'eg. Employer 1234 can\'t see shifts',
            name: 'title',
            value: '',
        },
        {
            type: 'textarea',
            label: 'Steps to Reproduce',
            placeholder: 'Bullet point steps to reproduce. Include specifics, eg. urls and ids',
            name: 'description',
            value: '',
        },
        {
            type: 'text',
            label: 'Expected Outcome',
            placeholder: 'What *should* happen when the above steps are taken?',
            name: 'expected',
            value: '',
        },
        {
            type: 'text',
            label: 'Current Outcome',
            placeholder: 'What *currently* happens when the above steps are taken?',
            name: 'currently',
            value: '',
        },

    ]
};

const data: Dialog = {
    callback_id: '',
    title: 'New Data Request',
    submit_label: 'Submit',
    state: 'support_data',
    elements: [
        {
            type: 'text',
            name: 'title',
            label: 'Title',
            placeholder: 'eg. Number of shifts per employer in Feb 2019',
            value: '',
        },
        {
            type: 'textarea',
            label: 'Description',
            placeholder: 'Please include any extra information required, eg. column names',
            name: 'description',
            value: '',
        },
    ]
};

interface Templates {
    [index: string]: Dialog
}

const templates: Templates = {
    bug,
    data
};

export { templates };
