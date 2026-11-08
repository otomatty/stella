public class Q28Min2Tests
{
    [Theory(DisplayName = "Q28 2つの最小")]
    [InlineData(3, 10, 3)]
    [InlineData(10, 3, 3)]
    [InlineData(4, 4, 4)]
    public void Q28Min2(int a, int b, int expected)
    {
        Assert.Equal(expected, Answers.Q28Min2(a, b));
    }
}
