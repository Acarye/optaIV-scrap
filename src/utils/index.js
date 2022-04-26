const fs = require("fs");
const stringify = require("csv");
const ObjectsToCsv = require('objects-to-csv')

const exportToCsv = async (data, name, input) => {
    await stringify.stringify(data, {header: true, delimiter: ','}, (err, output) => {
        if (err) throw err;
        fs.writeFile(`./src/${input ? 'input' : 'output'}/${name}.csv`, output, (err) => {
            if (err) throw err;
            console.log(`${name}.csv saved.`);
        });
    });
};

const objectToCSV = async (data, name, input,append) => {
    const csv = new ObjectsToCsv(data)
    await csv.toDisk(`./src/${input ? 'input' : 'output'}/${name}.csv`,{
        append,
    }).then((res)=>{
        console.log(`${name}.csv saved.`);
    })


};


const cleanText = (text) => {
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
};

module.exports = {
    cleanText,
    exportToCsv,
    objectToCSV
};