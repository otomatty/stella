public class S03WinnersTests
{
    [Theory(DisplayName = "S03 同点の上位")]
    [InlineData("4 2\n90 80 80 50\n", "3\n250\n")]
    [InlineData("3 1\n10 20 30\n", "1\n30\n")]
    public void S03Winners(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S03Winners())));
    }
}
