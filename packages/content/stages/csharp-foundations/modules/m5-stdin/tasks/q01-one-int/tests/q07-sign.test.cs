public class Q07SignTests
{
    [Theory(DisplayName = "Q07 符号")]
    [InlineData("-3\n", "negative\n")]
    [InlineData("0\n", "zero\n")]
    [InlineData("8\n", "positive\n")]
    public void Q07Sign(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q07Sign())));
    }
}
