<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="author" content="constracti" />
		<script src="https://unpkg.com/vexflow/releases/vexflow-min.js"></script>
	</head>
	<body>
		<div id="xml"></div>
		<script>
var mxml_file = '<?= $_GET['mxml'] ?>.xml';

<?php
echo file_get_contents( 'musicxml.js' );
?>
		</script>
	</body>
</html>
