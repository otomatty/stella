public class DaLastCharTests
{
    [Theory(DisplayName = "到達A 最後の文字")]
    [InlineData("abZ\n", "Z\n")]
    [InlineData("x\n", "x\n")]
    [InlineData("\n", "EMPTY\n")]
    public void DaLastChar(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DaLastChar())));
    }
}
