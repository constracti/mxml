function parseKey( xml_key ) {
	var fifths = parseInt( xml_key.getElementsByTagName( 'fifths' )[0].innerHTML );
	for ( var key in Vex.Flow.keySignature.keySpecs ) {
		let keyspec = Vex.Flow.keySignature.keySpecs[key];
		if ( typeof keyspec !== 'object' || !( 'acc' in keyspec ) || !( 'num' in keyspec ) )
			continue;
		if ( fifths >= 0 && keyspec.acc === '#' && keyspec.num === fifths )
			return key;
		if ( fifths < 0 && keyspec.acc === 'b' && -keyspec.num === fifths )
			return key;
	}
}

function parseClef( xml_clef ) {
	var sign = xml_clef.getElementsByTagName( 'sign' )[0].innerHTML;
	var line = '';
	if ( xml_clef.getElementsByTagName( 'line' ).length )
		line = parseInt( xml_clef.getElementsByTagName( 'line' )[0].innerHTML );
	var clef_octave_change = '';
	if ( xml_clef.getElementsByTagName( 'clef-octave-change' ).length )
		clef_octave_change = parseInt( clef.getElementsByTagName( 'clef-octave-change' )[0].innerHTML );
	// TODO sign: TAB, jianpu, none
	// TODO clef-octave-change
	switch ( sign + line ) {
		case 'G1': return 'french';
		case 'G2': return 'treble';
		case 'C1': return 'soprano';
		case 'C2': return 'mezzo-soprano';
		case 'C3': return 'alto';
		case 'C4': return 'tenor';
		case 'C5': return 'baritone-c';
		case 'F3': return 'baritone-f';
		case 'F4': return 'bass';
		case 'F5': return 'subbass';
		case 'percussion': return 'percussion';
	}
}

function getBarType( bar_style ) {
	switch ( bar_style ) {
		case 'regular':
		case 'dotted':
		case 'dashed':
		case 'heavy':
			return Vex.Flow.Barline.type.SINGLE;
		case 'light-light':
		case 'heavy-light':
			return Vex.Flow.Barline.type.DOUBLE;
		case 'light-heavy':
		case 'heavy-heavy':
			return Vex.Flow.Barline.type.END;
		case 'tick':
		case 'short':
		default:
			return Vex.Flow.Barline.type.NONE;
	}
	// TODO repeats
	// Vex.Flow.Barline.type.REPEAT_BEGIN;
	// Vex.Flow.Barline.type.REPEAT_END;
	// Vex.Flow.Barline.type.REPEAT_BOTH;
}

function parseDuration( type ) {
	switch ( type ) {
		// TODO maxima, long, 512th, 1024th
		case 'breve':   return '1/2';
		case 'whole':   return 'w';
		case 'half':    return 'h';
		case 'quarter': return 'q';
		case 'eighth':  return '8';
		case '16th':    return '16';
		case '32th':    return '32';
		case '64th':    return '64';
		case '128th':   return '128';
		case '256th':   return '256';
		default:        return 'h';
	}
}

function parsePitch( pitch ) {
	var step = pitch.getElementsByTagName( 'step' )[0].innerHTML;
	var octave = parseInt( pitch.getElementsByTagName( 'octave' )[0].innerHTML );
	return step + '/' + octave;
}

/*
 * part.id                   String
 * part.name                 String
 * part.abbreviation         String
 * part.staves               Array
 * part.staves[].vf_stave    Vex.Flow.Stave
 * part.staves[].clef        String
 * part.staves[].vf_voices   Object
 * part.staves[].vf_voices[] Vex.Flow.Voice
 * part.measures             int
 * part.vf_drawables         Array
 */

function build_part_staves( part, options, state ) {
	// stave options
	var stave_options = {};
	if ( part.staves.length > 1 ) {
		stave_options.left_bar = false;
		stave_options.right_bar = false;
	}
	for ( let stave_cnt = 0; stave_cnt < part.staves.length; stave_cnt++ ) {
		// stave vertical position
		if ( stave_cnt )
			state.y += options.STAVE_MARGIN;
		else if ( state.part_cnt )
			state.y += options.PART_MARGIN;
		else if ( state.line_cnt )
			state.y += options.LINE_MARGIN;
		else
			state.y = state.top;
		// create stave if it does not exist
		if ( !( stave_cnt in part.staves ) )
			part.staves[stave_cnt] = {
				vf_stave: null,
				vf_voices: {},
				clef: null,
			};
		// shorthand to current stave
		let stave = part.staves[stave_cnt];
		// create vf_stave
		stave.vf_stave = new Vex.Flow.Stave( state.x, state.y, options.STAVE_WIDTH, stave_options );
		// add clef and key signature to the first stave of each line
		if ( state.x === options.LINE_INDENT && stave.clef !== null )
			stave.vf_stave.addClef( stave.clef );
		if ( state.x === options.LINE_INDENT && part.key !== null )
			stave.vf_stave.addKeySignature( part.key );
		// move state.y to the bottom of the current stave
		state.y += options.STAVE_HEIGHT;
	}
	// set part left text
	if ( state.x === options.LINE_INDENT ) {
		if ( part.staves.length === 1 ) {
			part.getStave(0).vf_stave.setText( state.line_cnt ? part.abbreviation : part.name, Vex.Flow.Modifier.Position.LEFT );
		} else {
			let connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
			connector.setType( Vex.Flow.StaveConnector.type.BRACE );
			connector.setText( state.line_cnt ? part.abbreviation : part.name, Vex.Flow.Modifier.Position.LEFT );
			part.vf_drawables.push( connector );
		}
	}
	// add vertical part lines
	if ( part.staves.length > 1 ) {
		let vf_stave_top = part.staves[0].vf_stave;
		let vf_stave_bot = part.staves[part.staves.length - 1].vf_stave;
		let connector;
		connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
		connector.setType( Vex.Flow.StaveConnector.type.SINGLE_LEFT );
		part.vf_drawables.push( connector );
		connector = new Vex.Flow.StaveConnector( part.getStave(0).vf_stave, part.getStave(-1).vf_stave );
		connector.setType( Vex.Flow.StaveConnector.type.SINGLE_RIGHT );
		part.vf_drawables.push( connector );
	}
}

let xhttp = new XMLHttpRequest();
xhttp.onreadystatechange = function() {
	if ( this.readyState = 4 && this.status === 200 && this.responseXML !== null )
		parseXML( this.responseXML );
};
xhttp.open( 'GET', 'agioi.xml', true );
xhttp.send();

function parseXML( xml ) {
	let renderer = new Vex.Flow.Renderer( document.getElementById( 'xml' ), Vex.Flow.Renderer.Backends.SVG );
	var context = renderer.getContext();
	var line_width = document.getElementById( 'xml' ).offsetWidth - 20;

	var options = {
		LINE_INDENT:  200,
		STAVE_WIDTH:  250,
		STAVE_HEIGHT: 100,
		STAVE_MARGIN: 0,
		PART_MARGIN:  50,
		LINE_MARGIN:  100,
	};

	let score_partwise = xml.getElementsByTagName( 'score-partwise' )[0];
	var part_list = score_partwise.getElementsByTagName( 'part-list' )[0];
	var xml_parts = score_partwise.getElementsByTagName( 'part' );
	var parts = [];
	for ( let part_cnt = 0; part_cnt < xml_parts.length; part_cnt++ ) {
		let xml_part = xml_parts[part_cnt];
		parts.push ( {
			id: xml_part.id,
			name: part_list.getElementsByTagName( 'score-part' )[xml_part.id].getElementsByTagName( 'part-name' )[0].innerHTML,
			abbreviation: part_list.getElementsByTagName( 'score-part' )[xml_part.id].getElementsByTagName( 'part-abbreviation' )[0].innerHTML,
			key: null,
			time: null,
			staves: [],
			measures: xml_part.getElementsByTagName( 'measure' ).length,
			getStave: function( index ) {
				if ( index < 0 )
					index += this.staves.length;
				return this.staves[index];
			},
			vf_drawables: [],
		} );
	}

	var state = {
		x: options.LINE_INDENT,
		y: 0,
		top: 0,
		line_cnt: 0,
		part_cnt: 0,
	};

	var i = 0;
	var more = true;
	while ( true ) {
		// break if a part run out of measures
		for ( let part of parts ) {
			if ( i >= part.measures ) {
				more = false;
				break;
			}
		}
		if ( !more )
			break;
		// measure horizontal position
		if ( state.x > options.LINE_INDENT && state.x + options.STAVE_WIDTH > line_width ) {
			state.line_cnt++;
			state.x = options.LINE_INDENT;
			state.top = state.y;
		} else {
			state.y = state.top;
		}
		// loop each part
		for ( state.part_cnt = 0; state.part_cnt < xml_parts.length; state.part_cnt++ ) {
			// shorthand to current part
			var part = parts[state.part_cnt];
			// build part staves in case they are initialized
			if ( part.staves.length )
				build_part_staves( part, options, state );
			// loop each measure element
			for ( var element of xml_parts[state.part_cnt].getElementsByTagName( 'measure' )[i].children ) {
				switch ( element.tagName ) {
					case 'attributes':
						// build part staves in case the are not initialized
						if ( !part.staves.length ) {
							if ( element.getElementsByTagName( 'staves' ).length )
								part.staves = new Array( parseInt( element.getElementsByTagName( 'staves' )[0].innerHTML ) );
							else
								part.staves = new Array( 1 );
							build_part_staves( part, options, state );
							// add clef to staves
							for ( let xml_clef of element.getElementsByTagName( 'clef' ) ) {
								let stave_cnt = xml_clef.getAttribute( 'number' );
								if ( stave_cnt !== null )
									stave_cnt = parseInt( stave_cnt ) - 1;
								else
									stave_cnt = 0;
								let stave = part.staves[stave_cnt];
								stave.clef = parseClef( xml_clef );
								stave.vf_stave.addClef( stave.clef );
							}
							// add key signature to staves
							if ( element.getElementsByTagName( 'key' ).length ) {
								part.key = parseKey( element.getElementsByTagName( 'key' )[0] );
								for ( let stave of part.staves )
									stave.vf_stave.addKeySignature( part.key );
							}
							// add time signature to staves
							if ( element.getElementsByTagName( 'time' ).length ) {
								// TODO common time and common time cut
								part.time = {
									num_beats: parseInt( element.getElementsByTagName( 'time' )[0].getElementsByTagName( 'beats' )[0].innerHTML ),
									beat_value: parseInt( element.getElementsByTagName( 'time' )[0].getElementsByTagName( 'beat-type' )[0].innerHTML ),
								};
								for ( let stave of part.staves )
									stave.vf_stave.addTimeSignature( part.time.num_beats + '/' + part.time.beat_value );
							}
						}
						break;
					case 'note':
						// stave
						let stave_cnt = element.getElementsByTagName( 'staff' );
						if ( stave_cnt.length )
							stave_cnt = parseInt( stave_cnt[0].innerHTML ) - 1;
						else
							stave_cnt = 0;
						let stave = part.staves[stave_cnt];
						// voice
						let vf_voice = element.getElementsByTagName( 'voice' )[0].innerHTML;
						if ( !( vf_voice in stave.vf_voices ) )
							stave.vf_voices[vf_voice] = new Vex.Flow.Voice( part.time );
						vf_voice = stave.vf_voices[vf_voice];
						// note objects
						let note = {};
						let vf_note;
						// duration
						if ( element.getElementsByTagName( 'type' ).length )
							note.duration = parseDuration( element.getElementsByTagName( 'type' )[0].innerHTML );
						else
							note.duration = parseDuration();
						// dots
						note.dots = element.getElementsByTagName( 'dot' ).length;
						// clef
						note.clef = stave.clef;
						if ( element.getElementsByTagName( 'rest' ).length ) {
							if ( note.duration === 'w' )
								note.keys = [ 'c/5' ];
							else
								note.keys = [ 'b/4' ];
							note.duration += 'r';
							vf_note = new Vex.Flow.StaveNote( note );
							// TODO center align whole measure rests
						} else {
							note.keys = [ parsePitch( element.getElementsByTagName( 'pitch' )[0] ) ];
							// TODO accidentals https://usermanuals.musicxml.com/MusicXML/Content/EL-MusicXML-alter.htm
							// TODO chords https://usermanuals.musicxml.com/MusicXML/Content/EL-MusicXML-chord.htm
							vf_note = new Vex.Flow.StaveNote( note );
						}
						// dots
						for ( let dot = 0; dot < note.dots; dot++ )
							vf_note.addDotToAll();
						//
						vf_voice.addTickable( vf_note );
						break;
				}
			}
		}
		for ( let part of parts ) {
			for ( let stave of part.staves )
				stave.vf_stave.setContext( context ).draw();
			for ( let vf_drawable of part.vf_drawables )
				vf_drawable.setContext( context ).draw();
			part.vf_drawables = [];
		}
		let vf_voices = [];
		for ( let part of parts )
			for ( let stave of part.staves )
				for ( let voice_id in stave.vf_voices )
					vf_voices.push( stave.vf_voices[voice_id] );
		let formatter = new Vex.Flow.Formatter().joinVoices( vf_voices ).format( vf_voices, options.STAVE_WIDTH );
		vf_voices = [];
		for ( let part of parts ) {
			for ( let stave of part.staves ) {
				for ( let voice_id in stave.vf_voices )
					stave.vf_voices[voice_id].draw( context, stave.vf_stave );
				stave.vf_stave = null;
				stave.vf_voices = {};
			}
		}
		state.x += options.STAVE_WIDTH;
		i++;
		renderer.resize( line_width, state.y ); // TODO delete line
	}
	
	renderer.resize( line_width, state.y );
}
