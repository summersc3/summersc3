curl -X POST https://coilmicroservice-docker.azurewebsites.net/convert-currency \
  -H "Content-Type: application/json" \
  -d '{"senderCur":"USD","targetCur":"EUR","amount":100}'