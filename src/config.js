const path = require("path");

module.exports = {
  root: path.resolve(__dirname, ".."),
  sessionTtl: 30 * 24 * 60 * 60 * 1000,
  tournament: { maxTeams: 24, entryFee: 250 },
  payments: {
    dueDateInstallment1: "30/09",
    dueDateInstallment2: "05/10",
    dueDateFull: "05/10",
    cardLink: "https://link.infinitepay.io/gabriel-leal-cnn/VC1D-qlSpCiDP0c-250,00",
    pixFullLink: "https://cobranca.c6pix.com.br/01M2QXW0G1YRPRJNWAZHGEZ3DK",
    pixInstallmentLink: "https://cobranca.c6pix.com.br/01M2QXTRS4T7RCT14CE37BDZBG",
    whatsappNumber: "5592992864506"
  }
};
