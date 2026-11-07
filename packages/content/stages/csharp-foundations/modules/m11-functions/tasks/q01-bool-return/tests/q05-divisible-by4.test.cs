public class Q05DivisibleBy4Tests
{
    [Fact(DisplayName = "Q05 4で割り切れるか")]
    public void Q05DivisibleBy4()
    {
        Assert.Equal(true, Answers.Q05DivisibleBy4(2024));
        Assert.Equal(false, Answers.Q05DivisibleBy4(2023));
        Assert.Equal(true, Answers.Q05DivisibleBy4(2000));
    }
}
