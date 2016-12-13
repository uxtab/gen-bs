
exports.up = function(knex, Promise) {

    console.log('Adding url templates to field_metadata');

    const defaultLinkIdentity = '###DATA###';
    const url_templates = [
        {
            field_name: 'INFO_CLNACC',
            url: 'https://www.ncbi.nlm.nih.gov/clinvar/'
        },
        {
            field_name: 'VEP_SYMBOL',
            url: 'http://www.genenames.org/cgi-bin/gene_symbol_report?match='
        },
        {
            field_name: 'VEP_Gene',
            url: 'https://www.ncbi.nlm.nih.gov/gene?cmd=Retrieve&dopt=full_report&list_uids='
        },
        {
            field_name: 'VEP_Feature',
            url: 'https://www.ncbi.nlm.nih.gov/nuccore/'
        },
        {
            field_name: 'VEP_HGNC_ID',
            url: 'http://www.genenames.org/cgi-bin/gene_symbol_report?hgnc_id='
        },
        {
            field_name: 'VEP_PUBMED',
            url: 'https://www.ncbi.nlm.nih.gov/pubmed/'
        },
        {
            field_name: 'VEP_HGVSc_transcript',
            url: 'https://www.ncbi.nlm.nih.gov/nuccore/'
        },
        {
            field_name: 'VEP_HGVSp_transcript',
            url: 'https://www.ncbi.nlm.nih.gov/protein/'
        }
    ];

    return Promise.map(url_templates, (item) => {
        if (!item.field_name || !item.url) {
            return;
        }
        return knex('field_metadata')
            .where('name', item.field_name)
            .update({
                is_hyperlink: true,
                hyperlink_template: item.url + defaultLinkIdentity
            })
            .then((cnt) => {
                console.log(`=> add template: ${item.url} to field: ${item.field_name}... ${cnt ? 'OK' : 'FAILED'}`);
            });
    });
};

exports.down = function() {
    throw new Error('Not implemented');
};
