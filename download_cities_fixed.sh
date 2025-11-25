#!/bin/bash

# Create directory if it doesn't exist
mkdir -p /Users/dev/culturaimmersiva.it/public/images/cities

# Temporary directory for downloads
TEMP_DIR="/tmp/city_images_fixed"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Target directory
TARGET_DIR="/Users/dev/culturaimmersiva.it/public/images/cities"

# Counters
success_count=0
failed_count=0
failed_cities=""

echo "Starting download of city images with correct full URLs..."
echo "========================================="

download_city() {
    local city=$1
    local url=$2

    # Get the file extension from URL (before any query parameters)
    local extension="${url##*.}"
    extension="${extension%%\?*}"

    # Download to temp directory
    local temp_file="$TEMP_DIR/${city}.${extension}"

    echo -n "Downloading $city... "

    if curl -s -L -o "$temp_file" "$url"; then
        # Check if we got HTML instead of an image
        if file "$temp_file" | grep -q "HTML"; then
            echo "FAILED (got HTML instead of image)"
            ((failed_count++))
            failed_cities="$failed_cities $city"
            rm -f "$temp_file"
            return 1
        fi

        # If already webp, just copy it
        if [[ "$extension" == "webp" ]]; then
            cp "$temp_file" "$TARGET_DIR/${city}.webp"
            if [[ $? -eq 0 ]]; then
                echo "OK (copied webp)"
                ((success_count++))
            else
                echo "FAILED (copy error)"
                ((failed_count++))
                failed_cities="$failed_cities $city"
            fi
        else
            # Convert to webp
            if cwebp -q 85 "$temp_file" -o "$TARGET_DIR/${city}.webp" 2>/dev/null; then
                echo "OK (converted to webp)"
                ((success_count++))
            else
                echo "FAILED (conversion error)"
                ((failed_count++))
                failed_cities="$failed_cities $city"
            fi
        fi
    else
        echo "FAILED (download error)"
        ((failed_count++))
        failed_cities="$failed_cities $city"
    fi
}

# Download all cities with correct full URLs
download_city "alghero" "https://www.culturaimmersiva.it/wp-content/uploads/2024/11/Compressed_Alghero_City.png"
download_city "bari" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.02.37-A-scenic-view-of-Bari-Italy.-The-image-showcases-the-coastal-city-with-its-historic-old-town-the-iconic-Basilica-of-Saint-Nicholas-and-a-picturesqu.webp"
download_city "benevento" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.05.52-A-picturesque-view-of-Benevento-Italy-showcasing-its-rich-history-and-culture.-The-image-highlights-landmarks-such-as-the-Arch-of-Trajan-the-Santa-.webp"
download_city "bologna" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.04.58-A-breathtaking-and-vibrant-cityscape-of-Bologna-Italy-capturing-its-historic-essence-and-charm.-The-iconic-Two-Towers-Asinelli-and-Garisenda-rise-.webp"
download_city "brindisi" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-15-19.30.36-A-scenic-view-of-the-city-of-Brindisi-in-Puglia-Italy.-The-image-highlights-the-beautiful-harbor-with-boats-and-yachts-historic-architecture-and-th.webp"
download_city "cagliari" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/DALL·E-2024-12-02-00.31.22-A-picturesque-view-of-Cagliari-Italy-showcasing-its-historic-architecture-and-vibrant-Mediterranean-atmosphere.-The-scene-includes-the-iconic-Bastio.webp"
download_city "cassino" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/DALL·E-2024-12-11-13.03.19-A-scenic-view-of-Cassino-Italy-featuring-the-famous-Abbey-of-Monte-Cassino-atop-a-hill-with-lush-greenery-surrounding-it.-The-foreground-includes-a-.webp"
download_city "catania" "https://www.culturaimmersiva.it/wp-content/uploads/2024/07/A_picturesque_view_of_the_city_of_Catania2C_Italy_further_compressed_no_elephant.jpg"
download_city "chieti" "https://www.culturaimmersiva.it/wp-content/uploads/2024/09/compressed_chieti_image.jpg"
download_city "cosenza" "https://www.culturaimmersiva.it/wp-content/uploads/2024/11/Compressed_Cosenza_City.png"
download_city "creazzo" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/Vicenza_compressed.png"
download_city "empoli" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/Empoli_image_compressed.jpg"
download_city "ferrara" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.16.18-A-picturesque-view-of-Ferrara-Italy-showcasing-its-Renaissance-charm.-The-image-highlights-the-iconic-Castello-Estense-a-moated-medieval-castle-wit.webp"
download_city "foligno" "https://www.culturaimmersiva.it/wp-content/uploads/2025/11/ChatGPT-Image-Nov-19-2025-at-07_58_52-PM.png"
download_city "genova" "https://www.culturaimmersiva.it/wp-content/uploads/2024/08/DALL·E-2024-08-01-18.51.32-A-realistic-view-of-Genoa-Italy-focusing-on-the-iconic-Genoa-harbor-with-its-historic-port-featuring-numerous-boats-and-yachts-docked-along-the-wat.webp"
download_city "grottaglie" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-29-20.17.31-A-picturesque-view-of-Grottaglie-Italy-featuring-its-historic-old-town-with-whitewashed-buildings-narrow-stone-paved-streets-and-traditional-ceram.webp"
download_city "isernia" "https://www.culturaimmersiva.it/wp-content/uploads/2025/02/DALL·E-2025-02-19-21.04.31-A-realistic-aerial-view-of-the-city-of-Isernia-Italy-showcasing-its-historic-architecture-charming-streets-and-surrounding-green-hills.-The-image-.webp"
download_city "laquila" "https://www.culturaimmersiva.it/wp-content/uploads/2025/06/ChatGPT-Image-Jun-18-2025-at-06_11_56-PM.png"
download_city "lentini" "https://www.culturaimmersiva.it/wp-content/uploads/2024/10/DALL·E-2024-10-28-19.09.37-A-scenic-view-of-the-city-of-Lentini-Italy-capturing-its-historical-charm-and-Mediterranean-atmosphere.-The-scene-includes-ancient-buildings-and-rui.webp"
download_city "livorno" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.09.46-A-realistic-view-of-Livorno-Italy-capturing-the-bustling-port-with-fishing-boats-and-yachts-the-iconic-Terrazza-Mascagni-with-its-black-and-white-c.webp"
download_city "lucca" "https://www.culturaimmersiva.it/wp-content/uploads/2024/11/DALL·E-2024-11-04-17.26.50-A-beautiful-view-of-the-historic-city-of-Lucca-Italy.-Capture-the-medieval-walls-charming-old-town-streets-and-traditional-Italian-architecture.-Sh.webp"
download_city "modena" "https://www.culturaimmersiva.it/wp-content/uploads/2025/07/ChatGPT-Image-Jul-5-2025-at-12_38_56-AM.png"
download_city "monopoli" "https://www.culturaimmersiva.it/wp-content/uploads/2025/11/ChatGPT-Image-Nov-13-2025-at-12_14_18-AM-1.png"
download_city "montescaglioso" "https://www.culturaimmersiva.it/wp-content/uploads/2025/03/Montescaglioso_compressed.jpg"
download_city "napoli" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.10.58-A-breathtaking-view-of-Naples-Italy-featuring-the-Gulf-of-Naples-with-Mount-Vesuvius-in-the-background.-The-scene-includes-the-historic-Castel-dell.webp"
download_city "nola" "https://www.culturaimmersiva.it/wp-content/uploads/2025/11/ChatGPT-Image-Nov-13-2025-at-12_14_18-AM.png"
download_city "palermo" "https://www.culturaimmersiva.it/wp-content/uploads/2025/10/ChatGPT-Image-Oct-22-2025-at-12_56_56-PM.png"
download_city "pisa" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.08.29-A-stunning-view-of-Pisa-Italy-featuring-the-iconic-Leaning-Tower-of-Pisa-the-Cathedral-of-Santa-Maria-Assunta-and-the-Baptistery-in-the-Piazza-dei.webp"
download_city "pompei" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.11.05-A-stunning-depiction-of-ancient-Pompeii-Italy-featuring-the-ruins-of-the-Roman-city-with-Mount-Vesuvius-in-the-background.-The-scene-includes-the-re.webp"
download_city "ragusa" "https://www.culturaimmersiva.it/wp-content/uploads/2025/04/Ragusa_compressed.jpg"
download_city "reggio-calabria" "https://www.culturaimmersiva.it/wp-content/uploads/2024/08/compressed_reggio_di_calabria.png"
download_city "reggio-emilia" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-01-21.53.37-A-realistic-depiction-of-Reggio-Emilia-Italy-featuring-its-iconic-Calatrava-bridges-the-historic-city-center-with-classic-Italian-architecture-cob.webp"
download_city "salerno" "https://www.culturaimmersiva.it/wp-content/uploads/2025/01/DALL·E-2025-01-24-12.12.57-A-beautiful-view-of-Salerno-Italy-featuring-the-picturesque-Amalfi-Coastline-the-vibrant-port-and-historic-landmarks-such-as-the-Salerno-Cathedral.webp"
download_city "santa-maria-capua-vetere" "https://www.culturaimmersiva.it/wp-content/uploads/2024/08/Santa_Maria_Capua_Vetere_compressed-1.jpg"
download_city "sassari" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/DALL·E-2024-12-19-15.48.10-A-picturesque-view-of-Sassari-Italy-highlighting-its-historic-charm-with-traditional-stone-buildings-a-lively-public-square-and-iconic-cultural-la.webp"
download_city "savona" "https://www.culturaimmersiva.it/wp-content/uploads/2025/04/ChatGPT-Image-Apr-11-2025-at-08_08_20-PM.png"
download_city "siracusa" "https://www.culturaimmersiva.it/wp-content/uploads/2024/12/Siracusa_compressed.png"
download_city "taranto" "https://www.culturaimmersiva.it/wp-content/uploads/2025/07/ChatGPT-Image-Jul-5-2025-at-12_27_24-AM.png"
download_city "termoli" "https://www.culturaimmersiva.it/wp-content/uploads/2025/07/ChatGPT-Image-Jul-5-2025-at-12_32_46-AM.png"
download_city "trieste" "https://www.culturaimmersiva.it/wp-content/uploads/2025/07/ChatGPT-Image-Jul-4-2025-at-06_11_39-PM.png"
download_city "udine" "https://www.culturaimmersiva.it/wp-content/uploads/2025/10/ChatGPT-Image-Oct-22-2025-at-12_15_06-PM.png"
download_city "venezia-mestre" "https://www.culturaimmersiva.it/wp-content/uploads/2024/07/venezia.jpg"
download_city "viterbo" "https://www.culturaimmersiva.it/wp-content/uploads/2024/08/compressed_viterbo_image.jpg"

echo ""
echo "========================================="
echo "Download Summary:"
echo "  Successfully downloaded: $success_count/43"
echo "  Failed: $failed_count/43"
if [[ $failed_count -gt 0 ]]; then
    echo "  Failed cities:$failed_cities"
fi
echo "========================================="

# Cleanup temp directory
rm -rf "$TEMP_DIR"
