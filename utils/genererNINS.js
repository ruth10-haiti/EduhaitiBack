function genererNINS() {
    const annee = new Date().getFullYear();
    const aleatoire = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `NINS-${annee}-${aleatoire}`;
}
module.exports = genererNINS;