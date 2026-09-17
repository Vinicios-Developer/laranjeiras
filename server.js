require("dotenv").config();
const http = require("http");
const { router } = require("./src/routes");
const { sendError } = require("./src/utils/http");

const port = Number(process.env.PORT) || 3000;

http.createServer(async (request, response) => {
  try {
    await router.handle(request, response);
  } catch (error) {
    console.error(error);
    sendError(response, error.statusCode || 500, error.message || "Erro interno do servidor.");
  }
}).listen(port, () => console.log(`Copa Laranjeiras disponível em http://localhost:${port}`));
