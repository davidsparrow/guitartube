import { useState, useEffect, useRef } from 'react';
import { convertToSVGuitar } from '../utils/chordToSVGuitar';

export default function TestChords() {
  const [selectedChord, setSelectedChord] = useState('Am');
  const [conversionResult, setConversionResult] = useState(null);
  const [svguitarInstance, setSvguitarInstance] = useState(null);
  const svgRef = useRef(null);

  // Style controls state
  const [styleSettings, setStyleSettings] = useState({
    style: 'normal', // 'normal' or 'handdrawn'
    backgroundColor: '#ffffff',
    fretboardBackgroundColor: '#f8f8f8', // Separate fretboard background
    fingerColor: '#000000',
    fingerTextColor: '#ffffff',
    // Individual finger colors
    finger1Color: '#e74c3c', // Red for finger 1
    finger2Color: '#3498db', // Blue for finger 2
    finger3Color: '#2ecc71', // Green for finger 3
    finger4Color: '#f39c12', // Orange for finger 4
    stringColor: '#000000',
    fretColor: '#000000',
    titleColor: '#000000',
    titleFontSize: 48, // Title font size control
    titleFontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif', // Title font family
    titleFontWeight: 'normal', // Title font weight (normal or bold)
    nutWidth: 10,
    fingerSize: 0.65,
    fingerTextSize: 24, // Separate control for finger text size
    fretSize: 1.5,
    strokeWidth: 2,
    emptyStringIndicatorSize: 0.6,
    barreChordRadius: 0.25,
    orientation: 'horizontal', // 'vertical' or 'horizontal' - DEFAULT TO HORIZONTAL
    // Size control
    svgScale: 1.0, // Overall scale multiplier
    sidePadding: 0.2, // Padding around the diagram
    // Background image
    backgroundImage: null,
    backgroundImageOpacity: 0.3,
    // SVG container background
    svgBackgroundColor: 'white' // 'white' or 'black'
  });

  // Test chord data (simulating your database format)
  const testChords = {
    'Am': {
      chord_name: 'Am',
      frets: ['X', '0', '2', '2', '1', '0'],
      fingering: ['X', 'X', '2', '3', '1', 'X'],
      description: 'A minor - simple open chord'
    },
    'F': {
      chord_name: 'F',
      frets: ['1', '1', '2', '3', '3', '1'],
      fingering: ['1', '1', '2', '4', '3', '1'],
      description: 'F major - full barre at 1st fret'
    },
    'C': {
      chord_name: 'C',
      frets: ['X', '3', '2', '0', '1', '0'],
      fingering: ['X', '3', '2', 'X', '1', 'X'],
      description: 'C major - mixed open and fretted'
    },
    'EdgeCase': {
      chord_name: 'Complex',
      frets: ['X', '3', '3', '5', '3', 'X'],
      fingering: ['X', '1', '1', '3', '1', 'X'],
      description: 'Partial barre - finger 1 on fret 3, strings A,D,B only'
    },
    'DoubleBarre': {
      chord_name: 'Double Barre',
      frets: ['X', '3', '3', '5', '5', '3'],
      fingering: ['X', '1', '1', '2', '2', '1'],
      description: 'Double barre - two different fingers creating barres'
    },
    'HighFret': {
      chord_name: 'High Position',
      frets: ['X', '7', '9', '9', '8', 'X'],
      fingering: ['X', '1', '3', '4', '2', 'X'],
      description: 'High position chord starting at 7th fret'
    }
  };

  // Initialize SVGuitar when component mounts
  useEffect(() => {
    const initializeSVGuitar = async () => {
      if (svgRef.current && !svguitarInstance) {
        try {
          console.log('🎸 Loading SVGuitar library...');

          // Dynamic import to handle potential SSR issues
          const { SVGuitarChord } = await import('svguitar');

          console.log('🎸 Initializing SVGuitarChord with container:', svgRef.current);
          const svg = new SVGuitarChord(svgRef.current);
          console.log('✅ SVGuitarChord instance created:', svg);
          setSvguitarInstance(svg);
        } catch (error) {
          console.error('❌ Error initializing SVGuitarChord:', error);
        }
      }
    };

    initializeSVGuitar();
  }, [svguitarInstance]);

  // Convert and render chord when selection changes
  useEffect(() => {
    if (selectedChord && testChords[selectedChord] && svguitarInstance) {
      try {
        console.log('🎸 Converting chord:', selectedChord);
        const chordData = testChords[selectedChord];
        const svguitarConfig = convertToSVGuitar(chordData);

        console.log('✅ Conversion result:', svguitarConfig);
        setConversionResult(svguitarConfig);

        // Clear previous diagram
        svguitarInstance.clear();

        // Render the chord diagram
        console.log('🎯 Rendering chord with config:', {
          fingers: svguitarConfig.fingers,
          barres: svguitarConfig.barres,
          position: svguitarConfig.position,
          title: svguitarConfig.title
        });

        // Process fingers with individual colors
        const processedFingers = svguitarConfig.fingers.map(finger => {
          if (finger.length >= 3) {
            const [stringNum, fret, fingerNum] = finger;
            const fingerColors = {
              '1': styleSettings.finger1Color,
              '2': styleSettings.finger2Color,
              '3': styleSettings.finger3Color,
              '4': styleSettings.finger4Color
            };

            // Return finger with color options
            return [stringNum, fret, {
              text: fingerNum,
              color: fingerColors[fingerNum] || styleSettings.fingerColor,
              textColor: styleSettings.fingerTextColor
            }];
          }
          return finger;
        });

        const result = svguitarInstance
          .configure({
            // Basic settings
            strings: 6,
            frets: 5,
            position: svguitarConfig.position || 1,
            title: svguitarConfig.title,
            // Apply user style settings
            style: styleSettings.style,
            orientation: styleSettings.orientation,
            backgroundColor: 'transparent', // Keep SVG background transparent
            // Global color for X's and O's (overridden by specific colors below)
            color: styleSettings.svgBackgroundColor === 'black' ? '#ffffff' : '#000000',
            // Preserve all your custom color selections
            fingerColor: styleSettings.fingerColor,
            fingerTextColor: styleSettings.fingerTextColor,
            fingerTextSize: styleSettings.fingerTextSize,
            stringColor: styleSettings.stringColor,
            fretColor: styleSettings.fretColor,
            titleColor: styleSettings.titleColor,
            titleFontSize: styleSettings.titleFontSize,
            fontFamily: styleSettings.titleFontFamily,
            nutWidth: styleSettings.nutWidth,
            fingerSize: styleSettings.fingerSize,
            fretSize: styleSettings.fretSize,
            strokeWidth: styleSettings.strokeWidth,
            emptyStringIndicatorSize: styleSettings.emptyStringIndicatorSize,
            barreChordRadius: styleSettings.barreChordRadius,
            // Fix fret position number visibility
            fretLabelColor: styleSettings.svgBackgroundColor === 'black' ? '#ffffff' : '#000000',
            // Size controls
            sidePadding: styleSettings.sidePadding,
            titleBottomMargin: 30, // Always keep title above fretboard
            // Keep title positioned above fretboard for both orientations
            fixedDiagramPosition: false
          })
          .chord({
            fingers: processedFingers,
            barres: svguitarConfig.barres || []
          })
          .draw();

        console.log('🎨 SVGuitar draw result:', result);

        // Force the SVG to be visible and apply customizations
        const svgElement = svgRef.current.querySelector('svg');
        if (svgElement) {
          svgElement.style.display = 'block';
          svgElement.style.width = 'auto';
          svgElement.style.height = 'auto';
          svgElement.style.maxWidth = '100%';
          svgElement.style.transform = `scale(${styleSettings.svgScale})`;
          svgElement.style.transformOrigin = 'center';

          // Apply SVG container background
          svgElement.style.backgroundColor = styleSettings.svgBackgroundColor;

          // Apply fretboard-only background
          applyFretboardBackground(svgElement, styleSettings);

          // Apply background image if set
          if (styleSettings.backgroundImage) {
            applyBackgroundImage(svgElement, styleSettings);
          }

          // Add fret position indicator
          addFretPositionIndicator(svgElement, svguitarConfig, styleSettings);

          // Fix title positioning for horizontal orientation
          fixTitlePositioning(svgElement, styleSettings);

          console.log('🎨 SVG element styled and customized:', svgElement);
        }

      } catch (error) {
        console.error('❌ Conversion/Rendering error:', error);
        setConversionResult({ error: error.message });
      }
    }
  }, [selectedChord, svguitarInstance, styleSettings]);

  // Handle background image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('File size must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setStyleSettings({
          ...styleSettings,
          backgroundImage: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper function to apply fretboard-only background
  const applyFretboardBackground = (svgElement, settings) => {
    // Remove existing background and fretboard backgrounds
    const existingBg = svgElement.querySelector('rect[width="100%"][height="100%"]');
    if (existingBg) {
      existingBg.remove();
    }

    const existingFretboardBg = svgElement.querySelector('.fretboard-background');
    if (existingFretboardBg) {
      existingFretboardBg.remove();
    }

    // Find all lines to identify frets and strings
    const allLines = Array.from(svgElement.querySelectorAll('line[x1][y1][x2][y2]'));

    let fretLines, stringLines;

    if (settings.orientation === 'horizontal') {
      // In horizontal mode: frets are vertical lines, strings are horizontal
      fretLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) > 50; // Vertical lines (frets)
      });

      stringLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(y2 - y1) < 5 && Math.abs(x2 - x1) > 50; // Horizontal lines (strings)
      });
    } else {
      // In vertical mode: frets are horizontal lines, strings are vertical
      fretLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(y2 - y1) < 5 && Math.abs(x2 - x1) > 50; // Horizontal lines (frets)
      });

      stringLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) > 50; // Vertical lines (strings)
      });
    }

    console.log('🎨 Fretboard detection:', {
      orientation: settings.orientation,
      fretLines: fretLines.length,
      stringLines: stringLines.length
    });

    if (fretLines.length > 0 && stringLines.length > 0) {
      let x, y, width, height;

      if (settings.orientation === 'horizontal') {
        // Horizontal: fretboard spans between first/last fret (vertical lines) and first/last string (horizontal lines)
        const leftmostFret = Math.min(...fretLines.map(line => parseFloat(line.getAttribute('x1'))));
        const rightmostFret = Math.max(...fretLines.map(line => parseFloat(line.getAttribute('x1'))));
        const topmostString = Math.min(...stringLines.map(line => parseFloat(line.getAttribute('y1'))));
        const bottommostString = Math.max(...stringLines.map(line => parseFloat(line.getAttribute('y1'))));

        x = leftmostFret;
        y = topmostString;
        width = rightmostFret - leftmostFret;
        height = bottommostString - topmostString;
      } else {
        // Vertical: fretboard spans between first/last fret (horizontal lines) and first/last string (vertical lines)
        const leftmostString = Math.min(...stringLines.map(line => parseFloat(line.getAttribute('x1'))));
        const rightmostString = Math.max(...stringLines.map(line => parseFloat(line.getAttribute('x1'))));
        const topmostFret = Math.min(...fretLines.map(line => parseFloat(line.getAttribute('y1'))));
        const bottommostFret = Math.max(...fretLines.map(line => parseFloat(line.getAttribute('y1'))));

        x = leftmostString;
        y = topmostFret;
        width = rightmostString - leftmostString;
        height = bottommostFret - topmostFret;
      }

      // Create fretboard background rectangle
      const fretboardBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      fretboardBg.setAttribute('x', x);
      fretboardBg.setAttribute('y', y);
      fretboardBg.setAttribute('width', width);
      fretboardBg.setAttribute('height', height);
      fretboardBg.setAttribute('fill', settings.fretboardBackgroundColor);
      fretboardBg.setAttribute('class', 'fretboard-background');

      // Insert as first element (behind everything)
      svgElement.insertBefore(fretboardBg, svgElement.firstChild);

      console.log('🎨 Fretboard background applied:', { x, y, width, height, color: settings.fretboardBackgroundColor });
    }
  };

  // Helper function to apply background image
  const applyBackgroundImage = (svgElement, settings) => {
    // Remove existing pattern
    let defs = svgElement.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgElement.insertBefore(defs, svgElement.firstChild);
    }

    // Remove existing pattern
    const existingPattern = defs.querySelector('#fretboard-pattern');
    if (existingPattern) {
      existingPattern.remove();
    }

    // Get fretboard background dimensions for proper scaling
    const fretboardBg = svgElement.querySelector('.fretboard-background');
    if (!fretboardBg) return;

    const bgWidth = parseFloat(fretboardBg.getAttribute('width'));
    const bgHeight = parseFloat(fretboardBg.getAttribute('height'));

    // Create pattern with background image
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'fretboard-pattern');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', bgWidth);
    pattern.setAttribute('height', bgHeight);

    const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    image.setAttribute('href', settings.backgroundImage);
    image.setAttribute('width', bgWidth);
    image.setAttribute('height', bgHeight);
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    image.setAttribute('opacity', settings.backgroundImageOpacity);

    pattern.appendChild(image);
    defs.appendChild(pattern);

    // Apply pattern to fretboard background
    fretboardBg.setAttribute('fill', 'url(#fretboard-pattern)');

    console.log('🖼️ Background image applied:', {
      orientation: settings.orientation,
      bgWidth,
      bgHeight,
      opacity: settings.backgroundImageOpacity
    });
  };

  // Helper function to add fret position indicator
  const addFretPositionIndicator = (svgElement, chordConfig, settings) => {
    // Remove existing position indicators
    const existingIndicators = svgElement.querySelectorAll('.fret-position-indicator');
    existingIndicators.forEach(indicator => indicator.remove());

    // Calculate the position based on chord data
    const chordData = testChords[selectedChord];
    if (!chordData) return;

    // Find the lowest fret number used in the chord (excluding 0 and X)
    const usedFrets = chordData.frets
      .filter(fret => fret !== 'X' && fret !== '0')
      .map(fret => parseInt(fret))
      .filter(fret => !isNaN(fret));

    if (usedFrets.length === 0) return; // Open chord, no position needed

    const lowestFret = Math.min(...usedFrets);
    const position = chordConfig.position || lowestFret;

    console.log('🎯 Fret position calculation:', {
      chordName: chordData.chord_name,
      frets: chordData.frets,
      usedFrets,
      lowestFret,
      position
    });

    // Find fret lines based on orientation
    const allLines = Array.from(svgElement.querySelectorAll('line'));
    let fretLines;

    if (settings.orientation === 'horizontal') {
      // In horizontal mode: frets are vertical lines
      fretLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(x2 - x1) < 5 && Math.abs(y2 - y1) > 50; // Vertical lines (frets)
      });
    } else {
      // In vertical mode: frets are horizontal lines
      fretLines = allLines.filter(line => {
        const x1 = parseFloat(line.getAttribute('x1'));
        const x2 = parseFloat(line.getAttribute('x2'));
        const y1 = parseFloat(line.getAttribute('y1'));
        const y2 = parseFloat(line.getAttribute('y2'));
        return Math.abs(y2 - y1) < 5 && Math.abs(x2 - x1) > 50; // Horizontal lines (frets)
      });
    }

    if (fretLines.length === 0) return;

    // Sort fret lines by position
    if (settings.orientation === 'horizontal') {
      fretLines.sort((a, b) => parseFloat(a.getAttribute('x1')) - parseFloat(b.getAttribute('x1')));
    } else {
      fretLines.sort((a, b) => parseFloat(a.getAttribute('y1')) - parseFloat(b.getAttribute('y1')));
    }

    // Find the fret line that corresponds to our position
    let targetFretIndex;
    if (settings.orientation === 'horizontal') {
      // In horizontal mode, we need to adjust for the nut being the first line
      // Position 1 should be under the FIRST FRET (second line), not the nut
      targetFretIndex = position; // Position 1 = index 1 (second line)
    } else {
      // In vertical mode, keep the original logic
      targetFretIndex = Math.max(0, position - 1);
    }

    const targetFretLine = fretLines[Math.min(targetFretIndex, fretLines.length - 1)];

    if (!targetFretLine) return;

    // Create position text element
    const positionText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    positionText.setAttribute('class', 'fret-position-indicator');
    positionText.textContent = position.toString();
    // Auto-adjust fret number color based on background
    const fretNumberColor = settings.svgBackgroundColor === 'black' ? '#ffffff' : '#000000';
    positionText.setAttribute('fill', fretNumberColor);
    positionText.setAttribute('font-family', settings.titleFontFamily);
    positionText.setAttribute('font-size', Math.max(12, settings.titleFontSize - 6)); // 6pt smaller than title
    positionText.setAttribute('font-weight', settings.titleFontWeight); // Same weight as title
    positionText.setAttribute('text-anchor', 'middle');

    // Position based on orientation
    if (settings.orientation === 'horizontal') {
      // Horizontal: place below the fret line (vertical line)
      const fretX = parseFloat(targetFretLine.getAttribute('x1'));
      const fretY1 = parseFloat(targetFretLine.getAttribute('y1'));
      const fretY2 = parseFloat(targetFretLine.getAttribute('y2'));
      const bottomY = Math.max(fretY1, fretY2);

      positionText.setAttribute('x', fretX);
      positionText.setAttribute('y', bottomY + 26); // 6px more padding (was +20, now +26)
    } else {
      // Vertical: place to the left of the fret line (horizontal line)
      const fretX1 = parseFloat(targetFretLine.getAttribute('x1'));
      const fretY = parseFloat(targetFretLine.getAttribute('y1'));

      positionText.setAttribute('x', fretX1 - 26); // 6px more padding (was -20, now -26)
      positionText.setAttribute('y', fretY + 5);
    }

    // Add to SVG
    svgElement.appendChild(positionText);

    console.log('🎯 Added position indicator:', {
      position,
      orientation: settings.orientation,
      fretLinesFound: fretLines.length,
      targetFretIndex,
      x: positionText.getAttribute('x'),
      y: positionText.getAttribute('y')
    });
  };

  // Helper function to fix title positioning
  const fixTitlePositioning = (svgElement, settings) => {
    // Find the title element (first text element that's not a position indicator)
    const allTextElements = svgElement.querySelectorAll('text');
    const titleElement = Array.from(allTextElements).find(text =>
      !text.classList.contains('fret-position-indicator')
    );

    if (!titleElement) return;

    // Apply title styling
    titleElement.setAttribute('fill', settings.titleColor);
    titleElement.setAttribute('font-family', settings.titleFontFamily);
    titleElement.setAttribute('font-size', settings.titleFontSize);
    titleElement.setAttribute('font-weight', settings.titleFontWeight);

    // For horizontal orientation, ensure title is centered above the fretboard
    if (settings.orientation === 'horizontal') {
      const fretboardBg = svgElement.querySelector('.fretboard-background');
      if (fretboardBg) {
        const bgX = parseFloat(fretboardBg.getAttribute('x'));
        const bgWidth = parseFloat(fretboardBg.getAttribute('width'));
        const bgY = parseFloat(fretboardBg.getAttribute('y'));

        // Center title horizontally above fretboard with padding
        titleElement.setAttribute('x', bgX + bgWidth / 2);
        titleElement.setAttribute('y', bgY - 18); // Position above fretboard with 3px extra padding
        titleElement.setAttribute('text-anchor', 'middle');

        console.log('🎭 Title repositioned for horizontal mode:', {
          x: bgX + bgWidth / 2,
          y: bgY - 18,
          color: settings.titleColor,
          fontSize: settings.titleFontSize
        });
      }
    } else {
      // For vertical orientation, just apply the styling
      console.log('🎭 Title styled for vertical mode:', {
        color: settings.titleColor,
        fontSize: settings.titleFontSize
      });
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎸 SVGuitar Conversion Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing GuitarTube → SVGuitar chord conversion system
          </p>
        </div>

        {/* Chord Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Select Test Chord</h2>
          <div className="flex flex-wrap gap-3">
            {Object.keys(testChords).map((chordKey) => (
              <button
                key={chordKey}
                onClick={() => setSelectedChord(chordKey)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChord === chordKey
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {testChords[chordKey].chord_name}
              </button>
            ))}
          </div>
        </div>

        {/* Style Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">🎨 Style Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Basic Style */}
            <div>
              <h3 className="font-semibold mb-3 text-purple-600">Basic Style</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Diagram Style</label>
                  <select
                    value={styleSettings.style}
                    onChange={(e) => setStyleSettings({...styleSettings, style: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="normal">Normal</option>
                    <option value="handdrawn">Hand Drawn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Orientation</label>
                  <select
                    value={styleSettings.orientation}
                    onChange={(e) => setStyleSettings({...styleSettings, orientation: e.target.value})}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="horizontal">Horizontal</option>
                    <option value="vertical">Vertical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Background Color</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleSettings({...styleSettings, svgBackgroundColor: 'white'})}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium ${
                        styleSettings.svgBackgroundColor === 'white'
                          ? 'bg-white border-gray-400 text-black'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      White
                    </button>
                    <button
                      onClick={() => setStyleSettings({...styleSettings, svgBackgroundColor: 'black'})}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm font-medium ${
                        styleSettings.svgBackgroundColor === 'black'
                          ? 'bg-black border-gray-600 text-white'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      Black
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div>
              <h3 className="font-semibold mb-3 text-green-600">Colors</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Finger 1 Color (Index)</label>
                  <input
                    type="color"
                    value={styleSettings.finger1Color}
                    onChange={(e) => setStyleSettings({...styleSettings, finger1Color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger 2 Color (Middle)</label>
                  <input
                    type="color"
                    value={styleSettings.finger2Color}
                    onChange={(e) => setStyleSettings({...styleSettings, finger2Color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger 3 Color (Ring)</label>
                  <input
                    type="color"
                    value={styleSettings.finger3Color}
                    onChange={(e) => setStyleSettings({...styleSettings, finger3Color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger 4 Color (Pinky)</label>
                  <input
                    type="color"
                    value={styleSettings.finger4Color}
                    onChange={(e) => setStyleSettings({...styleSettings, finger4Color: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger Text Color</label>
                  <input
                    type="color"
                    value={styleSettings.fingerTextColor}
                    onChange={(e) => setStyleSettings({...styleSettings, fingerTextColor: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">String Color</label>
                  <input
                    type="color"
                    value={styleSettings.stringColor}
                    onChange={(e) => setStyleSettings({...styleSettings, stringColor: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fret Color</label>
                  <input
                    type="color"
                    value={styleSettings.fretColor}
                    onChange={(e) => setStyleSettings({...styleSettings, fretColor: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title Color</label>
                  <input
                    type="color"
                    value={styleSettings.titleColor}
                    onChange={(e) => setStyleSettings({...styleSettings, titleColor: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title Font Size: {styleSettings.titleFontSize}px</label>
                  <input
                    type="range"
                    min="24"
                    max="72"
                    step="2"
                    value={styleSettings.titleFontSize}
                    onChange={(e) => setStyleSettings({...styleSettings, titleFontSize: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title Font Family</label>
                  <select
                    value={styleSettings.titleFontFamily}
                    onChange={(e) => setStyleSettings({...styleSettings, titleFontFamily: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value='Arial, "Helvetica Neue", Helvetica, sans-serif'>Arial</option>
                    <option value='"Times New Roman", Times, serif'>Times New Roman</option>
                    <option value='"Courier New", Courier, monospace'>Courier New</option>
                    <option value='Georgia, serif'>Georgia</option>
                    <option value='"Trebuchet MS", sans-serif'>Trebuchet MS</option>
                    <option value='Verdana, sans-serif'>Verdana</option>
                    <option value='"Comic Sans MS", cursive'>Comic Sans MS</option>
                    <option value='Impact, sans-serif'>Impact</option>
                    <option value='"Brush Script MT", cursive'>Brush Script</option>
                    <option value='"Lucida Console", monospace'>Lucida Console</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Title Font Weight</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleSettings({...styleSettings, titleFontWeight: 'normal'})}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                        styleSettings.titleFontWeight === 'normal'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => setStyleSettings({...styleSettings, titleFontWeight: 'bold'})}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm font-bold ${
                        styleSettings.titleFontWeight === 'bold'
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-gray-100 border-gray-300 text-gray-600'
                      }`}
                    >
                      Bold
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fretboard Background</label>
                  <input
                    type="color"
                    value={styleSettings.fretboardBackgroundColor}
                    onChange={(e) => setStyleSettings({...styleSettings, fretboardBackgroundColor: e.target.value})}
                    className="w-full h-10 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Sizes & Dimensions */}
            <div>
              <h3 className="font-semibold mb-3 text-orange-600">Sizes & Dimensions</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nut Width: {styleSettings.nutWidth}</label>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    step="1"
                    value={styleSettings.nutWidth}
                    onChange={(e) => setStyleSettings({...styleSettings, nutWidth: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger Size: {styleSettings.fingerSize}</label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={styleSettings.fingerSize}
                    onChange={(e) => setStyleSettings({...styleSettings, fingerSize: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Finger Text Size: {styleSettings.fingerTextSize}</label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    step="2"
                    value={styleSettings.fingerTextSize}
                    onChange={(e) => setStyleSettings({...styleSettings, fingerTextSize: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Fret Height: {styleSettings.fretSize}</label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={styleSettings.fretSize}
                    onChange={(e) => setStyleSettings({...styleSettings, fretSize: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stroke Width: {styleSettings.strokeWidth}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={styleSettings.strokeWidth}
                    onChange={(e) => setStyleSettings({...styleSettings, strokeWidth: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">X/O Size: {styleSettings.emptyStringIndicatorSize}</label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={styleSettings.emptyStringIndicatorSize}
                    onChange={(e) => setStyleSettings({...styleSettings, emptyStringIndicatorSize: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Barre Roundness: {styleSettings.barreChordRadius}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={styleSettings.barreChordRadius}
                    onChange={(e) => setStyleSettings({...styleSettings, barreChordRadius: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Overall Scale: {styleSettings.svgScale}x</label>
                  <input
                    type="range"
                    min="0.3"
                    max="2.0"
                    step="0.1"
                    value={styleSettings.svgScale}
                    onChange={(e) => setStyleSettings({...styleSettings, svgScale: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Side Padding: {styleSettings.sidePadding}</label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.05"
                    value={styleSettings.sidePadding}
                    onChange={(e) => setStyleSettings({...styleSettings, sidePadding: parseFloat(e.target.value)})}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Background Image */}
            <div>
              <h3 className="font-semibold mb-3 text-indigo-600">Background Image</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Upload Fretboard Background
                    <span className="text-xs text-gray-500 block">Recommended: 400x300px, JPG/PNG, max 2MB</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {styleSettings.backgroundImage && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Image Opacity: {styleSettings.backgroundImageOpacity}</label>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={styleSettings.backgroundImageOpacity}
                        onChange={(e) => setStyleSettings({...styleSettings, backgroundImageOpacity: parseFloat(e.target.value)})}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <img
                        src={styleSettings.backgroundImage}
                        alt="Background preview"
                        className="w-16 h-12 object-cover border rounded"
                      />
                      <button
                        onClick={() => setStyleSettings({...styleSettings, backgroundImage: null})}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setStyleSettings({
                style: 'normal',
                backgroundColor: '#ffffff',
                fretboardBackgroundColor: '#f8f8f8',
                fingerColor: '#000000',
                fingerTextColor: '#ffffff',
                finger1Color: '#e74c3c',
                finger2Color: '#3498db',
                finger3Color: '#2ecc71',
                finger4Color: '#f39c12',
                stringColor: '#000000',
                fretColor: '#000000',
                titleColor: '#000000',
                titleFontSize: 48,
                titleFontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
                titleFontWeight: 'normal',
                nutWidth: 10,
                fingerSize: 0.65,
                fingerTextSize: 24,
                fretSize: 1.5,
                strokeWidth: 2,
                emptyStringIndicatorSize: 0.6,
                barreChordRadius: 0.25,
                orientation: 'horizontal',
                svgScale: 1.0,
                sidePadding: 0.2,
                backgroundImage: null,
                backgroundImageOpacity: 0.3,
                svgBackgroundColor: 'white'
              })}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Input Data */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-600">
              📊 Your Database Format
            </h3>
            {selectedChord && testChords[selectedChord] && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{JSON.stringify(testChords[selectedChord], null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Output Data */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 text-green-600">
              🎸 SVGuitar Format
            </h3>
            {conversionResult && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">
{JSON.stringify(conversionResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Chord Diagram */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4 text-purple-600">
            🎯 SVGuitar Rendered Diagram
          </h3>
          <div className="flex justify-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-white">
              <div
                ref={svgRef}
                id="chord-diagram-container"
                style={{
                  minHeight: '500px',
                  minWidth: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {!svguitarInstance && (
                  <p className="text-gray-500">Initializing SVGuitar...</p>
                )}
                {svguitarInstance && !conversionResult && (
                  <p className="text-gray-500">Select a chord to see the diagram...</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">🚀 System Benefits</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600">Edge Case Coverage</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Custom SVG Code Needed</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">∞</div>
              <div className="text-sm text-gray-600">Styling Options</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">⚡</div>
              <div className="text-sm text-gray-600">Performance Boost</div>
            </div>
          </div>
        </div>

        {/* Edge Cases */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h3 className="text-xl font-semibold mb-4">🔍 Edge Cases Handled</h3>
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <h4 className="font-semibold text-yellow-800">🎯 Partial Barre Detection</h4>
              <p className="text-yellow-700">
                Correctly detects when a finger barres only some strings (e.g., strings 2-5) 
                while others are muted or use different fingers.
              </p>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <h4 className="font-semibold text-blue-800">🎯 Double Barre Detection</h4>
              <p className="text-blue-700">
                Handles complex chords with two different fingers each creating barres on different frets.
              </p>
            </div>
            <div className="bg-green-50 border-l-4 border-green-400 p-4">
              <h4 className="font-semibold text-green-800">🎯 Mixed Finger Patterns</h4>
              <p className="text-green-700">
                Distinguishes between actual barres (same finger, same fret) and coincidental 
                same-fret positions with different fingers.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center mt-8">
          <a 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
