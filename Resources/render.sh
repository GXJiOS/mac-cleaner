#!/bin/bash
# 从 SVG 生成 macOS 26 兼容的图标资源：AppIcon.icns + Assets.car
#
# 关键约束（踩过坑，别改）：
#   macOS 26 会比对图标的 alpha 轮廓。必须精确等于 824x824+100+100 的标准
#   squircle，否则系统判定为旧式图标，套一层灰白背板并把图标缩小塞进去。
#   所以：SVG 只画内容（铺满 1024），圆角由 mask/ 蒙版裁切，投影交给系统。
#   自绘投影或描边哪怕只溢出 1px（826x826+99+99）都会触发背板。
#
# 另外 Assets.car 是必需的：只放 icns 同样会被套背板。
set -euo pipefail
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
ICONSET="AppIcon.iconset"

command -v magick >/dev/null || { echo "需要 ImageMagick: brew install imagemagick"; exit 1; }

rm -rf "$ICONSET" _tmp && mkdir -p "$ICONSET" _tmp

# $1=源SVG $2=像素 $3=输出名(不含扩展名)
render() {
  printf '<!DOCTYPE html><meta charset=utf-8><style>html,body{margin:0;background:transparent;overflow:hidden}img{display:block;width:%spx;height:%spx}</style><img src="../%s">' \
    "$2" "$2" "$1" > _tmp/w.html
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --default-background-color=00000000 --force-device-scale-factor=1 \
    --window-size="$2,$2" --screenshot="_tmp/raw_$3.png" \
    "file://$PWD/_tmp/w.html" >/dev/null 2>&1
  [ -s "_tmp/raw_$3.png" ] || { echo "渲染失败: $3"; exit 1; }
  # 套 squircle 蒙版决定最终轮廓
  magick "_tmp/raw_$3.png" "mask/$3.png" -alpha off -compose CopyOpacity -composite "$ICONSET/$3.png"
  printf "  %-24s %s\n" "$3.png" "$(magick "$ICONSET/$3.png" -alpha extract -format '%@' info:)"
}

echo "渲染 + 套蒙版："
render icon-small.svg   16  icon_16x16
render icon-small.svg   32  icon_16x16@2x
render icon-small.svg   32  icon_32x32
render icon.svg         64  icon_32x32@2x
render icon.svg        128  icon_128x128
render icon.svg        256  icon_128x128@2x
render icon.svg        256  icon_256x256
render icon.svg        512  icon_256x256@2x
render icon.svg        512  icon_512x512
render icon.svg       1024  icon_512x512@2x
rm -rf _tmp

# 组 asset catalog 并用 actool 编译（Assets.car 不可省）
rm -rf AppIcon.xcassets car_out && mkdir -p AppIcon.xcassets/AppIcon.appiconset car_out
cp "$ICONSET"/*.png AppIcon.xcassets/AppIcon.appiconset/
cp AppIcon.appiconset/Contents.json AppIcon.xcassets/AppIcon.appiconset/
echo '{ "info" : { "version":1, "author":"xcode" } }' > AppIcon.xcassets/Contents.json

echo
echo "actool 编译："
xcrun actool AppIcon.xcassets --compile car_out --platform macosx \
  --minimum-deployment-target 14.0 --app-icon AppIcon \
  --output-partial-info-plist _partial.plist >/dev/null 2>&1
rm -f _partial.plist
cp car_out/Assets.car  Assets.car
cp car_out/AppIcon.icns AppIcon.icns
rm -rf car_out
echo "  Assets.car   $(stat -f%z Assets.car) 字节"
echo "  AppIcon.icns $(stat -f%z AppIcon.icns) 字节"

# 同步一份 appiconset（以后迁 Xcode 直接可用）
rm -f AppIcon.appiconset/*.png
cp "$ICONSET"/*.png AppIcon.appiconset/
echo
echo "完成。跑 Scripts/make-app.sh 打包。"
