<?php
echo "Document Root: " . getcwd() . "\n";
echo "Files: " . print_r(glob("*"), true);
?>
