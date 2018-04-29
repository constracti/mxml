<!DOCTYPE html>
<html>
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="author" content="constracti" />
		<script src="https://unpkg.com/vexflow/releases/vexflow-min.js"></script>
	</head>
	<body>
		<div id="container" data-mxml-url="<?= $_GET['mxml'] ?>.xml" data-mxml-renderer="renderer">
			<div id="options"></div>
			<div id="renderer"></div>
		</div>
		<script>
<?php
echo file_get_contents( 'mxml.js' );
?>
		</script>
		<script>
mxmlLoad( 'container', function() {
	mxmlRender( 'container', {
		transpose: {
			diatonic: 2,
			chromatic: 4,
		},
	} );
} );
		</script>
	</body>
</html>
