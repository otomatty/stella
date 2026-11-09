public class Q19PairsTests
{
    [Theory(DisplayName = "Q19 ちょうどK")]
    [InlineData("4 10\n2 4 6 8\n", "2\n")]
    [InlineData("2 10\n2 8\n", "1\n")]
    public void Q19Pairs(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q19Pairs())));
    }
}
