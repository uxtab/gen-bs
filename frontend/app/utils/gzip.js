import pako from 'pako';
/**
 * gzip file
 * @param {File} file - File for gzip.
 * @returns {Promise} - When resolved promise returns File with gzipped file and with name = file.name + '.gz'
 */
export default function gzip(file) {

    const reader = new FileReader();

    const promise = new Promise((resolve) => {
        reader.onload = (e => {
            const ch = new Uint8Array(e.target.result);
            const content = pako.gzip(ch);
            const theFile = new File([content], file.name + '.gz', {type: 'application/gzip', lastModified: new Date()});
            resolve(theFile);
        });
    });

    reader.readAsArrayBuffer(file);
    return promise;
}

