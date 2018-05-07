<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="author" content="constracti" />
		<script src="https://unpkg.com/vexflow/releases/vexflow-min.js"></script>
	</head>
	<body>
		<div id="container" data-mxml-url="<?= $_GET['mxml'] ?>.xml"></div>
		<div id="renderer"></div>
		<script>
<?php
echo file_get_contents( 'mxml.js' );
?>
		</script>
		<script>
mxmlLoad( document.getElementById( 'container' ), function( container ) {
	var renderer = document.getElementById( 'renderer' );
	mxmlRender( mxmlResponses[container.id], renderer, {
		visibleParts: ['P1'],
	} );
} );
		</script>
	</body>
</html>
