center=0   # Start position of the center of the first image.
             # This can be ANYTHING, as only relative changes are important.
i=0
row=0

d="Huan_Pack_`date +%h-%m-%Y-%H-%M`"

rm -rf tmp/*

node ppn_summary.js| xargs -P 4 -n 4 wget

  for image in tmp/*
  do
    
    if [ -s "$image" ]; then 
        center=`convert xc: -format "%[fx: $center +230 ]" info:`
    
    
    convert -size 1000x1000 "$image" -thumbnail 400x400 \
            -set caption '%t' -bordercolor Lavender -background black \
            -pointsize 36  -density 96x96  +polaroid  -resize 50% \
            -gravity center -background None -extent 300x300 -trim \
            -repage +${center}+$((row * 230))\!    MIFF:-
    fi

  if [ -s "$image" ]; then 
        let "i=i+1"
        
        if (( $i % 4 == 0 )); then
            let "row=row+1"
            center=0
        fi
    fi

  done |
    convert -background transparent   MIFF:-  -layers merge +repage \
            -bordercolor transparent -border 3x3   tmp/$d.png

    echo tmp/$d.png