# JS bundles
curl --ssl-no-revoke -Lo vendor/kuroshiro/kuroshiro.min.js \
  https://unpkg.com/kuroshiro/dist/kuroshiro.min.js
curl --ssl-no-revoke -Lo vendor/kuroshiro-analyzer-kuromoji/kuroshiro-analyzer-kuromoji.min.js \
  https://unpkg.com/kuroshiro-analyzer-kuromoji/dist/kuroshiro-analyzer-kuromoji.min.js

# License files
curl --ssl-no-revoke -Lo vendor/kuroshiro/LICENSE \
  https://raw.githubusercontent.com/hexenq/kuroshiro/master/LICENSE
curl --ssl-no-revoke -Lo vendor/kuroshiro-analyzer-kuromoji/LICENSE \
  https://raw.githubusercontent.com/hexenq/kuroshiro-analyzer-kuromoji/master/LICENSE
curl --ssl-no-revoke -Lo vendor/kuromoji/LICENSE-2.0.txt \
  https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/LICENSE-2.0.txt
curl --ssl-no-revoke -Lo vendor/kuromoji/NOTICE.md \
  https://raw.githubusercontent.com/takuyaa/kuromoji.js/master/NOTICE.md

# Dictionary files (~8MB total)
mkdir -p vendor/kuromoji/dict
for f in base check tid tid_pos tid_map unk unk_pos unk_map unk_char unk_compat unk_invoke cc; do
  curl -Lo vendor/kuromoji/dict/${f}.dat.gz \
    https://unpkg.com/kuromoji@0.1.2/dict/${f}.dat.gz
done